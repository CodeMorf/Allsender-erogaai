import { GoogleGenAI, Type } from '@google/genai';
import { createWorker, PSM, type Worker as TesseractWorker } from 'tesseract.js';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseReceiptLineItems } from './services/receipt-line-parser.service.ts';
import { 
  AIProviderType, 
  ReceiptExtraction, 
  ClassificationSuggestion, 
  ValidationResult, 
  AIUsage,
  ExpenseClassification,
  NcfType
} from '../src/types.ts';
import { prismaRepo } from './database/prisma.repository.ts';
import { validateFiscalData, type FiscalValidationInput } from './services/fiscal-validation.service.ts';

export interface ReceiptImage {
  base64Data: string;
  mimeType: string;
  filename?: string;
}

export interface ReceiptData extends FiscalValidationInput {
  supplier_name: string;
}

export interface AITestResult {
  status: 'ONLINE' | 'ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_KEY' | 'INVALID_MODEL' | 'OFFLINE';
  message: string;
  latency_ms: number;
}

export interface AIProvider {
  providerType: AIProviderType;
  testConnection(): Promise<AITestResult>;
  extractReceiptData(image: ReceiptImage): Promise<ReceiptExtraction>;
  extractReceiptSessionData?(images: ReceiptImage[]): Promise<ReceiptExtraction>;
  extractReceiptTextData?(rawText: string, localExtraction?: ReceiptExtraction): Promise<ReceiptExtraction>;
  classifyExpense(data: ReceiptData): Promise<ClassificationSuggestion>;
  validateExtraction(data: ReceiptData): Promise<ValidationResult>;
  getUsage(): Promise<AIUsage>;
}

// Validation is shared with the server-side approval gate so OCR and approval
// cannot disagree about what constitutes a valid fiscal extraction.
export { validateFiscalData };

const MULTI_SEGMENT_PROMPT = `Las imágenes adjuntas son segmentos consecutivos del MISMO comprobante fiscal dominicano. Analiza todos los segmentos como un solo documento, respetando HEADER, BODY y FOOTER. Extrae exclusivamente información visible y devuelve JSON compatible con ReceiptExtraction. Incluye supplier_name, supplier_rnc, ncf, ncf_type, date, subtotal, itbis_amount, legal_tip_amount, other_taxes, total_amount, currency, document_type, suggested_classification, suggested_category, confidence_score, raw_text, observations y todos los line_items. Cada line_item debe incluir description, sku si aparece, quantity, unit_price, discount si aparece, taxable_amount si aparece, itbis_rate, itbis_amount si aparece, total, segment_index, confidence y raw_text. Las fotos pueden solaparse: no dupliques líneas del borde entre segmentos consecutivos. No inventes productos, cantidades ni montos. Si un dato no es visible, déjalo vacío o en cero. No completes clasificación contable ni deducibilidad fiscal como hechos: déjalas vacías para revisión humana. Responde únicamente JSON válido.`;
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-20b';
const GROQ_PRICING: Record<string, { input: number; output: number }> = {
  'openai/gpt-oss-20b': { input: 0.075, output: 0.30 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.60 }
};
const GROQ_LOCAL_TEXT_PROMPT = `Recibirás únicamente texto producido por OCR local de un comprobante fiscal dominicano. No recibirás imágenes. Ordena y corrige errores obvios de OCR solo cuando el propio texto permita confirmarlos. Devuelve exclusivamente JSON compatible con ReceiptExtraction, con supplier_name, supplier_rnc, ncf, ncf_type, date (YYYY-MM-DD), subtotal, itbis_amount, legal_tip_amount, other_taxes, total_amount, currency, document_type, suggested_classification, suggested_category, confidence_score, raw_text, observations y line_items. No inventes datos: si un dato no aparece claramente, conserva el valor local, déjalo vacío o en cero. Respeta conceptos con valor cero y no confundas TOTAL NETO/SUBTOTAL con TOTAL. Usa el cuadre matemático solo para validar, no para crear importes no visibles. No inventes clasificación contable, categoría ni deducibilidad fiscal.`;

function normalizeGroqModel(model?: string): string {
  const normalized = (model || '').trim();
  if (!normalized || normalized === 'llama-3.1-8b-instant' || normalized === 'llama-3.3-70b-versatile' || normalized === 'llama-3.2-11b-vision-preview') {
    return GROQ_DEFAULT_MODEL;
  }
  return normalized;
}

function imageAsDataUrl(image: ReceiptImage): string {
  return image.base64Data.startsWith('data:') || /^https?:\/\//i.test(image.base64Data)
    ? image.base64Data
    : `data:${image.mimeType || 'image/jpeg'};base64,${image.base64Data}`;
}

function unverifiedClassification(reason = 'No existe evidencia suficiente para clasificar automáticamente este gasto.'): ClassificationSuggestion {
  return {
    classification: '' as ExpenseClassification,
    category: '',
    confidence: 0,
    reasoning: reason,
    tax_deductibility: 'NO_DETERMINADO'
  } as ClassificationSuggestion;
}

async function extractOpenAICompatibleSession(input: {
  endpoint: string;
  apiKey: string;
  model: string;
  images: ReceiptImage[];
}): Promise<{ extraction: ReceiptExtraction; usage: any }> {
  const content = [
    { type: 'text', text: MULTI_SEGMENT_PROMPT },
    ...input.images.map(image => ({
      type: 'image_url',
      image_url: { url: imageAsDataUrl(image) }
    }))
  ];
  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.apiKey}` },
    body: JSON.stringify({
      model: input.model,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' }
    })
  });
  if (!response.ok) throw new Error(`Proveedor de visión respondió con HTTP ${response.status}`);
  const body = await response.json();
  const parsed = JSON.parse(body.choices?.[0]?.message?.content || '{}') as ReceiptExtraction;
  return { extraction: parsed, usage: body.usage || {} };
}

// ----------------------------------------------------
// Free Local OCR Fallback (Tesseract.js)
// ----------------------------------------------------
export type OCRProviderUsed = AIProviderType | 'TESSERACT';

let localOCRWorkerPromise: Promise<TesseractWorker> | null = null;
let localOCRQueue: Promise<void> = Promise.resolve();

const getLocalOCRWorker = async (): Promise<TesseractWorker> => {
  if (!localOCRWorkerPromise) {
    const cachePath = process.env.TESSERACT_CACHE_PATH || path.join(process.cwd(), 'data', 'tesseract');
    await mkdir(cachePath, { recursive: true });
    localOCRWorkerPromise = createWorker(['spa', 'eng'], 1, { cachePath });
  }
  return localOCRWorkerPromise;
};

async function readReceiptImageBuffer(image: ReceiptImage): Promise<Buffer> {
  const payload = imageAsDataUrl(image);
  if (payload.startsWith('data:')) {
    const encoded = payload.match(/^data:[^;]+;base64,([\s\S]+)$/)?.[1];
    if (!encoded) throw new Error('La imagen del comprobante no contiene Base64 válido.');
    return Buffer.from(encoded, 'base64');
  }
  if (/^https?:\/\//i.test(payload)) {
    const response = await fetch(payload);
    if (!response.ok) throw new Error(`No se pudo descargar la imagen del comprobante (HTTP ${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  }
  return Buffer.from(payload, 'base64');
}

async function prepareLocalOCRImage(image: ReceiptImage): Promise<Buffer> {
  const source = await readReceiptImageBuffer(image);

  return sharp(source, { failOn: 'none' })
    .rotate()
    .trim()
    .resize({ width: 1400, height: 2400, fit: 'inside', withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1 })
    .png()
    .toBuffer();
}

async function prepareLocalOCRReceiptCrops(image: ReceiptImage): Promise<Buffer[]> {
  const rotatedSource = await sharp(await readReceiptImageBuffer(image), { failOn: 'none' }).rotate().toBuffer();
  const metadata = await sharp(rotatedSource).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (!width || !height || height <= width * 1.7) return [];

  const left = Math.round(width * 0.08);
  const cropWidth = Math.max(1, Math.round(width * 0.84));
  const headerHeight = Math.max(1, Math.round(height * 0.38));
  const bodyTop = Math.round(height * 0.28);
  const bodyHeight = Math.max(1, Math.min(height - bodyTop, Math.round(height * 0.45)));
  return Promise.all([
    sharp(rotatedSource).extract({ left, top: 0, width: cropWidth, height: headerHeight }).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: false }).grayscale().normalize().sharpen({ sigma: 1 }).png().toBuffer(),
    sharp(rotatedSource).extract({ left, top: bodyTop, width: cropWidth, height: bodyHeight }).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: false }).png().toBuffer()
  ]);
}

const parseMoneyValue = (rawValue?: string): number => {
  if (!rawValue) return 0;
  let value = rawValue.replace(/[^0-9,.-]/g, '');
  if (!value) return 0;

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    const decimalLength = value.length - lastComma - 1;
    value = decimalLength === 2 ? value.replace(',', '.') : value.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimalLength = value.length - lastDot - 1;
    if (decimalLength !== 2) value = value.replace(/\./g, '');
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findLabeledAmount = (lines: string[], pattern: RegExp): number => {
  const directLine = lines.find(candidate => pattern.test(candidate) && /-?\d[\d.,]*[.,]\d{2}\b/.test(candidate));
  if (directLine) {
    const values = directLine.match(/-?\d[\d.,]*[.,]\d{2}\b/g) || [];
    return parseMoneyValue(values.at(-1));
  }

  const labelIndex = lines.findIndex(candidate => pattern.test(candidate));
  const followingLine = labelIndex >= 0 ? lines[labelIndex + 1] : '';
  if (followingLine && /^\s*-?\d[\d.,]*[.,]\d{2}\s*$/.test(followingLine)) {
    return parseMoneyValue(followingLine);
  }
  return 0;
};

const normalizeReceiptDate = (rawValue?: string): string => {
  if (!rawValue) return '';
  const clean = rawValue.trim();

  const isoMatch = clean.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
  }

  const localMatch = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})/);
  if (localMatch) {
    const first = Number(localMatch[1]);
    const second = Number(localMatch[2]);
    const month = first > 12 ? second : second > 12 ? first : second;
    const day = first > 12 ? first : second > 12 ? second : first;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${localMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
};

const isSupplierNameCandidate = (line: string): boolean => {
  if (line.length < 3 || line.length > 90) return false;
  if ((line.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length < 3) return false;
  return !/(R\.?\s*N\.?\s*C\.?|C[EÉ]DULA|E?-?NCF|FACTURA|RECIBO|TEL\b|TEL[EÉ]FONO|FECHA|EMISI[ÓO]N|SUBTOTAL|ITBIS|TIBIS|IBIS|IVA|TAX|TOTAL|CAMBIO|CAJERO|CALLE|AV(?:ENIDA)?\.?|DIRECCI[ÓO]N|SECTOR|CIUDAD|SANTO\s+DOMINGO|MESA|SERV\b|RAZ[ÓO]N\s+SOCIAL|CLIENTE|DIRECCION|HORA|FIRMA|CODIGO\s+DE\s+SEGURIDAD)/i.test(line);
};

const receiptQuality = (extraction: ReceiptExtraction): number => (
  (extraction.supplier_name ? 10 : 0)
  + (extraction.supplier_rnc ? 20 : 0)
  + (extraction.ncf ? 25 : 0)
  + (extraction.date ? 10 : 0)
  + (extraction.subtotal > 0 ? 10 : 0)
  + (extraction.itbis_amount > 0 ? 5 : 0)
  + (extraction.total_amount > 0 ? 20 : 0)
  + (extraction.line_items.length > 0 ? 25 : 0)
  + extraction.confidence_score / 10
);

function supplierCandidateQuality(value: string): number {
  const text = (value || '').trim();
  if (!text) return 0;
  const letters = (text.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
  const usefulCharacters = (text.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,&'/-]/g) || []).length;
  return letters + Math.min(20, usefulCharacters / Math.max(text.length, 1) * 20);
}

function mergeLocalExtractions(base: ReceiptExtraction, supplement: ReceiptExtraction): ReceiptExtraction {
  const preferText = (current: string, additional: string): string => current || additional;
  const preferNumber = (current: number, additional: number): number => current > 0 ? current : additional;
  const supplementSubtotal = supplement.subtotal > 0
    && (supplement.total_amount > supplement.subtotal + 0.01
      || (supplement.itbis_amount > 0 && Math.abs(supplement.subtotal + supplement.itbis_amount - supplement.total_amount) <= 0.02))
    ? supplement.subtotal
    : 0;
  const supplierName = supplierCandidateQuality(supplement.supplier_name) > supplierCandidateQuality(base.supplier_name)
    ? supplement.supplier_name
    : base.supplier_name;
  const lineItems = supplement.line_items.length > base.line_items.length
    ? supplement.line_items
    : base.line_items;
  return {
    ...base,
    supplier_name: supplierName,
    supplier_rnc: preferText(base.supplier_rnc, supplement.supplier_rnc),
    ncf: preferText(base.ncf, supplement.ncf),
    date: preferText(base.date, supplement.date),
    ncf_type: base.ncf ? base.ncf_type : supplement.ncf_type,
    subtotal: preferNumber(base.subtotal, supplementSubtotal),
    itbis_amount: preferNumber(base.itbis_amount, supplement.itbis_amount),
    legal_tip_amount: preferNumber(base.legal_tip_amount, supplement.legal_tip_amount),
    total_amount: preferNumber(base.total_amount, supplement.total_amount),
    line_items: lineItems,
    confidence_score: Math.min(74, Math.max(base.confidence_score, supplement.confidence_score)),
    raw_text: [base.raw_text, supplement.raw_text].filter(Boolean).join('\n'),
    observations: [...new Set([
      ...(base.observations || []),
      ...(supplement.observations || []),
      'Se combinaron las lecturas del encabezado y el cuerpo; revise los campos antes de aprobar.'
    ])]
  };
}

function reconcileSingleLocalItem(
  lineItems: ReceiptExtraction['line_items'],
  subtotal: number,
  itbisAmount: number,
  legalTipAmount: number,
  otherTaxes: number,
  totalAmount: number
): ReceiptExtraction['line_items'] {
  if (lineItems.length !== 1 || subtotal <= 0 || totalAmount <= 0) return lineItems;
  const item = lineItems[0];
  const expectedTotal = subtotal + itbisAmount + legalTipAmount + otherTaxes;
  const itemLooksLikeGrandTotal = item.total === 0 || Math.abs(item.total - totalAmount) <= 0.02;
  if (!itemLooksLikeGrandTotal || Math.abs(expectedTotal - totalAmount) > 0.02) return lineItems;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return [{
    ...item,
    quantity,
    unit_price: Number((subtotal / quantity).toFixed(2)),
    total: Number(subtotal.toFixed(2)),
    ...(itbisAmount > 0 ? { itbis_amount: Number(itbisAmount.toFixed(2)) } : {}),
    confidence: Math.min(item.confidence ?? 70, 70)
  }];
}

export function parseLocalOCRText(rawText: string, confidence: number = 0, segmentIndex = 0): ReceiptExtraction {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const normalizedText = lines.join('\n');

  const rncMatch = normalizedText.match(/(?:R\.?N\.?C\.?|C[EÉ]DULA)\s*[:#-]?\s*([0-9-]{9,15})/i);
  const ncfMatch = normalizedText.match(/(?:E?-?NCF\s*[:#-]?\s*)?\b((?:B(?:01|02|11|14|15|16)|E(?:31|32|44|45))[\s-]*\d{8,10})\b/i);
  const dateLine = lines.find(line => /\b(?:FECHA|EMISI[ÓO]N|DATE)\b/i.test(line) && /\b\d{1,2}[-/.]\d{1,2}[-/.]20\d{2}\b/.test(line))
    || lines.find(line => /\b\d{1,2}[-/.]\d{1,2}[-/.]20\d{2}\b/.test(line))
    || '';

  const rncIndex = lines.findIndex(line => /(?:R\.?\s*N\.?\s*C\.?|C[EÉ]DULA)/i.test(line));
  const supplierName = (rncIndex >= 0
    ? lines.slice(0, rncIndex).reverse().find(isSupplierNameCandidate)
    : undefined)
    || lines.find(isSupplierNameCandidate)
    || '';

  const subtotal = findLabeledAmount(lines, /\b(?:SUB\s*TOTAL|TOTAL\s+NETO)\b/i);
  const itbisAmount = findLabeledAmount(lines, /\b(?:ITBIS|TIBIS|IBIS|I8IS|IVA|TAX)\b/i)
    || findLabeledAmount(lines, /\bUS\s+(?!\$)/i);
  const legalTipAmount = findLabeledAmount(lines, /\b(?:PROPINA|LEY\s*54-32)\b/i);
  const totalAmount = findLabeledAmount(lines, /\b(?:TOTAL\s+(?:A\s+PAGAR|GENERAL)|MONTO\s+TOTAL)\b/i)
    || findLabeledAmount(lines.filter(line => !/\b(?:SUB\s*TOTAL|TOTAL\s+NETO|TOTAL\s+DE\s+ART[IÍ]CULOS?)\b/i.test(line)), /\bTOTAL\b(?!\s+(?:NETO|DE\s+ART[IÍ]CULOS?))/i);

  const normalizedNcf = (ncfMatch?.[1] || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const detectedNcfType = normalizedNcf.slice(0, 3);
  const supportedNcfTypes: NcfType[] = ['B01', 'B02', 'B11', 'B14', 'B15', 'B16', 'E31', 'E32', 'E44', 'E45'];
  const ncfType = supportedNcfTypes.includes(detectedNcfType as NcfType)
    ? detectedNcfType as NcfType
    : '' as NcfType;
  const lineItems = reconcileSingleLocalItem(
    parseReceiptLineItems(rawText, segmentIndex),
    subtotal,
    itbisAmount,
    legalTipAmount,
    0,
    totalAmount
  );
  const structuralScore = Math.min(100,
    (supplierName ? 10 : 0)
    + (rncMatch ? 20 : 0)
    + (ncfMatch ? 20 : 0)
    + (totalAmount > 0 ? 20 : 0)
    + (lineItems.length > 0 ? 25 : 0)
    + (/\bFECHA\b/i.test(normalizedText) ? 5 : 0)
  );
  const safeConfidence = Math.max(0, Math.min(92, Math.round((confidence || 0) * 0.45 + structuralScore * 0.55)));
  const inferredDocumentType = ncfType
    ? (ncfType === 'B02' || ncfType === 'E32'
      ? 'FACTURA_CONSUMO'
      : ncfType.startsWith('E') ? 'COMPROBANTE_ELECTRONICO' : 'FACTURA_CREDITO_FISCAL')
    : '';

  return {
    supplier_name: supplierName,
    supplier_rnc: (rncMatch?.[1] || '').replace(/[^0-9]/g, ''),
    ncf: normalizedNcf,
    ncf_type: ncfType,
    date: normalizeReceiptDate(dateLine),
    subtotal,
    itbis_amount: itbisAmount,
    legal_tip_amount: legalTipAmount,
    other_taxes: 0,
    total_amount: totalAmount,
    currency: '' as ReceiptExtraction['currency'],
    document_type: inferredDocumentType as ReceiptExtraction['document_type'],
    suggested_classification: '' as ExpenseClassification,
    suggested_category: '',
    confidence_score: safeConfidence,
    line_items: lineItems,
    raw_text: rawText,
    observations: [
      'Comprobante leído localmente; revise los campos antes de aprobar.',
      'Los campos no visibles permanecen vacíos; el sistema no completa valores fiscales por defecto.',
      'La clasificación contable y la deducibilidad requieren confirmación.'
    ]
  };
}

export async function extractWithLocalOCR(image: ReceiptImage, segmentIndex = 0): Promise<ReceiptExtraction> {
  if (/pdf/i.test(image.mimeType)) {
    throw new Error('El OCR local admite imágenes JPG, PNG o WEBP; los PDF requieren un proveedor de IA activo.');
  }

  const task = localOCRQueue.then(async () => {
    const worker = await getLocalOCRWorker();
    const recognizeWithMode = async (
      input: Buffer | string,
      pageSegmentationMode: PSM.AUTO | PSM.SINGLE_BLOCK
    ): Promise<ReceiptExtraction> => {
      await worker.setParameters({ tessedit_pageseg_mode: pageSegmentationMode });
      const result = await worker.recognize(input);
      return parseLocalOCRText(result.data.text || '', result.data.confidence || 0, segmentIndex);
    };

    const originalInput = await prepareLocalOCRImage(image);
    const primary = await recognizeWithMode(originalInput, PSM.AUTO);
    const candidates: ReceiptExtraction[] = [primary];
    const needsRetry = (extraction: ReceiptExtraction) => extraction.confidence_score < Number(process.env.LOCAL_OCR_CONFIDENCE_THRESHOLD || 78)
      || !extraction.supplier_rnc
      || !extraction.ncf
      || extraction.total_amount <= 0
      || extraction.line_items.length === 0;

    if (!needsRetry(primary)) {
      return primary;
    }

    try {
      const cropInputs = await prepareLocalOCRReceiptCrops(image);
      if (cropInputs.length > 0) {
        const needsHeader = !primary.supplier_name || !primary.supplier_rnc || !primary.ncf || !primary.date;
        const needsBody = primary.total_amount <= 0 || primary.line_items.length === 0;
        const cropIndexes = [
          ...(needsHeader ? [0] : []),
          ...(needsBody ? [1] : [])
        ];
        let mergedCropExtraction = primary;
        for (const cropIndex of cropIndexes) {
          const cropInput = cropInputs[cropIndex];
          const cropResult = await recognizeWithMode(cropInput, PSM.SINGLE_BLOCK);
          mergedCropExtraction = mergeLocalExtractions(mergedCropExtraction, cropResult);
          candidates.push(mergedCropExtraction);
        }
      } else {
        candidates.push(await recognizeWithMode(originalInput, PSM.SINGLE_BLOCK));
      }
    } catch (error: any) {
      console.warn(`[Local OCR] No se pudo mejorar la imagen; se conservará la mejor lectura original: ${error.message}`);
    }

    return candidates.reduce((best, candidate) => (
      receiptQuality(candidate) > receiptQuality(best) ? candidate : best
    ), primary);
  });

  localOCRQueue = task.then(() => undefined, () => undefined);

  try {
    return await task;
  } catch (error) {
    const failedWorkerPromise = localOCRWorkerPromise;
    localOCRWorkerPromise = null;
    if (failedWorkerPromise) {
      const failedWorker = await failedWorkerPromise.catch(() => null);
      await failedWorker?.terminate().catch(() => undefined);
    }
    throw error;
  }
}

// ----------------------------------------------------
// Google Gemini Provider (Vision AI Engine)
// ----------------------------------------------------
export class GeminiAIProvider implements AIProvider {
  public providerType: AIProviderType = 'GEMINI';
  private apiKey: string;
  private model: string;
  private orgId: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash', orgId: string = 'org_allsender_corp') {
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.5-flash';
    this.orgId = orgId;
  }

  async testConnection(): Promise<AITestResult> {
    const startTime = Date.now();
    if (!this.apiKey || this.apiKey.trim() === '') {
      return { status: 'INVALID_KEY', message: 'API Key de Gemini no configurada.', latency_ms: 0 };
    }
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const response = await ai.models.generateContent({
        model: this.model,
        contents: 'Responde únicamente OK para prueba de latencia.'
      });
      const duration = Date.now() - startTime;
      if (response && response.text) {
        return { status: 'ONLINE', message: `Conexión verificada exitosamente con Gemini (${this.model}).`, latency_ms: duration };
      }
      return { status: 'ERROR', message: 'Gemini no retornó contenido.', latency_ms: duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const msg = error.message || String(error);
      if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        return { status: 'INVALID_KEY', message: 'API Key rechazada por Google Gemini.', latency_ms: duration };
      }
      if (msg.includes('NOT_FOUND') || msg.includes('404')) {
        return { status: 'INVALID_MODEL', message: `Modelo '${this.model}' no encontrado o sin acceso.`, latency_ms: duration };
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return { status: 'RATE_LIMIT', message: 'Límite de peticiones de Gemini excedido (Quota Exceeded).', latency_ms: duration };
      }
      return { status: 'ERROR', message: `Error al conectar con Gemini: ${msg}`, latency_ms: duration };
    }
  }

  async extractReceiptData(image: ReceiptImage): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    if (!this.apiKey) {
      throw new Error('No existe una API Key de Gemini configurada para la organización.');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const prompt = `Analiza la siguiente imagen de un comprobante o factura fiscal de la República Dominicana (DGII). Extrae únicamente datos visibles y verificables en formato JSON. No inventes, no completes valores por defecto y no deduzcas clasificación contable ni deducibilidad fiscal. Si un dato no está visible, usa cadena vacía o cero según el tipo. Extrae supplier_name, supplier_rnc, ncf, ncf_type, date, subtotal, itbis_amount, legal_tip_amount, other_taxes, total_amount, currency, document_type, confidence_score, line_items, raw_text y observations.`;

      const cleanBase64 = image.base64Data.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: image.mimeType || 'image/jpeg'
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const duration = Date.now() - startTime;
      const parsed = JSON.parse(response.text) as ReceiptExtraction;

      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'GEMINI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: 1500,
        tokens_completion: 400,
        duration_ms: duration,
        status: 'SUCCESS'
      });

      return {
        ...parsed,
        ncf_type: (parsed.ncf_type as NcfType) || ('' as NcfType),
        suggested_classification: '' as ExpenseClassification,
        suggested_category: '',
        currency: (parsed.currency as ReceiptExtraction['currency']) || ('' as ReceiptExtraction['currency']),
        confidence_score: Number.isFinite(Number(parsed.confidence_score)) ? Number(parsed.confidence_score) : 0,
        observations: [...new Set([...(parsed.observations || []), 'La clasificación contable no se completa automáticamente; requiere revisión.'])]
      };
    } catch (error: any) {
      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'GEMINI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: 0,
        tokens_completion: 0,
        duration_ms: Date.now() - startTime,
        status: 'ERROR'
      });
      console.error('[Gemini AI Engine] Extracción fallida:', error.message);
      throw error;
    }
  }

  async extractReceiptSessionData(images: ReceiptImage[]): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    if (!this.apiKey) throw new Error('No existe una API Key de Gemini configurada para la organización.');
    if (images.length === 0) throw new Error('La sesión no contiene imágenes.');
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const parts: any[] = [{ text: MULTI_SEGMENT_PROMPT }];
      for (const image of images) {
        parts.push({ inlineData: { data: image.base64Data.replace(/^data:[^;]+;base64,/, ''), mimeType: image.mimeType || 'image/jpeg' } });
      }
      const response = await ai.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' }
      });
      const extraction = JSON.parse(response.text) as ReceiptExtraction;
      extraction.suggested_classification = '' as ExpenseClassification;
      extraction.suggested_category = '';
      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'GEMINI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: 1500 * images.length,
        tokens_completion: 800,
        duration_ms: Date.now() - startTime,
        status: 'SUCCESS'
      });
      return extraction;
    } catch (error) {
      await prismaRepo.logAIUsage({ organization_id: this.orgId, provider_type: 'GEMINI', model: this.model, action: 'EXTRACT_RECEIPT', tokens_prompt: 0, tokens_completion: 0, duration_ms: Date.now() - startTime, status: 'ERROR' });
      throw error;
    }
  }

  async classifyExpense(_data: ReceiptData): Promise<ClassificationSuggestion> {
    return unverifiedClassification();
  }

  async validateExtraction(data: ReceiptData): Promise<ValidationResult> {
    return validateFiscalData(data);
  }

  async getUsage(): Promise<AIUsage> {
    const logs = (await prismaRepo.getAIUsageLogs(this.orgId)).filter(l => l.provider_type === 'GEMINI');
    const total_requests = logs.length;
    const total_tokens = logs.reduce((acc, l) => acc + l.tokens_prompt + l.tokens_completion, 0);
    return {
      total_requests,
      total_tokens,
      estimated_cost_usd: (total_tokens / 1000000) * 0.15,
      average_latency_ms: logs.length > 0 ? Math.round(logs.reduce((a, b) => a + b.duration_ms, 0) / logs.length) : 0
    };
  }
}

// ----------------------------------------------------
// Groq AI Provider (Real HTTP Client)
// ----------------------------------------------------
export class GroqAIProvider implements AIProvider {
  public providerType: AIProviderType = 'GROQ';
  private apiKey: string;
  private model: string;
  private orgId: string;

  constructor(apiKey: string, model: string = GROQ_DEFAULT_MODEL, orgId: string = 'org_allsender_corp') {
    this.apiKey = apiKey;
    this.model = normalizeGroqModel(model);
    this.orgId = orgId;
  }

  async testConnection(): Promise<AITestResult> {
    const startTime = Date.now();
    if (!this.apiKey || this.apiKey.trim() === '') {
      return { status: 'INVALID_KEY', message: 'API Key de Groq no configurada.', latency_ms: 0 };
    }
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      const duration = Date.now() - startTime;
      if (res.status === 401) return { status: 'INVALID_KEY', message: 'API Key de Groq rechazada.', latency_ms: duration };
      if (!res.ok) return { status: 'ERROR', message: `Groq retornó HTTP ${res.status}`, latency_ms: duration };
      return { status: 'ONLINE', message: `Conexión verificada exitosamente con Groq (${this.model}).`, latency_ms: duration };
    } catch (err: any) {
      return { status: 'ERROR', message: `Error de conexión con Groq: ${err.message}`, latency_ms: Date.now() - startTime };
    }
  }

  async extractReceiptData(image: ReceiptImage): Promise<ReceiptExtraction> {
    const localExtraction = await extractWithLocalOCR(image);
    return this.extractReceiptTextData(localExtraction.raw_text, localExtraction);
  }

  async extractReceiptSessionData(images: ReceiptImage[]): Promise<ReceiptExtraction> {
    if (!this.apiKey) throw new Error('API Key de Groq no configurada.');
    const localSegments: ReceiptExtraction[] = [];
    for (const image of images) {
      localSegments.push(await extractWithLocalOCR(image));
    }
    const rawText = localSegments.map((segment, index) => `[SEGMENTO ${index + 1}]\n${segment.raw_text}`).join('\n');
    return this.extractReceiptTextData(rawText, localSegments[0]);
  }

  async extractReceiptTextData(rawText: string, localExtraction?: ReceiptExtraction): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    if (!this.apiKey) throw new Error('API Key de Groq no configurada.');
    if (!rawText.trim()) throw new Error('Groq requiere texto producido por OCR local; no se enviará la imagen.');

    try {
      const localContext = localExtraction ? JSON.stringify({
        supplier_name: localExtraction.supplier_name,
        supplier_rnc: localExtraction.supplier_rnc,
        ncf: localExtraction.ncf,
        date: localExtraction.date,
        subtotal: localExtraction.subtotal,
        itbis_amount: localExtraction.itbis_amount,
        total_amount: localExtraction.total_amount,
        line_items: localExtraction.line_items
      }) : '{}';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: `${GROQ_LOCAL_TEXT_PROMPT}\n\nESTRUCTURA LOCAL (solo referencia):\n${localContext}\n\nTEXTO OCR LOCAL:\n${rawText}` }],
          response_format: { type: 'json_object' },
          max_tokens: 900
        })
      });
      if (!res.ok) throw new Error(`Groq API respondió con HTTP ${res.status}`);

      const json = await res.json();
      const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}') as Partial<ReceiptExtraction>;
      const base = localExtraction || parseLocalOCRText(rawText);
      const extraction: ReceiptExtraction = {
        ...base,
        ...parsed,
        supplier_name: parsed.supplier_name || base.supplier_name,
        supplier_rnc: parsed.supplier_rnc || base.supplier_rnc,
        ncf: parsed.ncf || base.ncf,
        ncf_type: (parsed.ncf_type || base.ncf_type || '') as NcfType,
        date: parsed.date || base.date,
        subtotal: Number(parsed.subtotal || base.subtotal || 0),
        itbis_amount: Number(parsed.itbis_amount || base.itbis_amount || 0),
        legal_tip_amount: Number(parsed.legal_tip_amount || base.legal_tip_amount || 0),
        other_taxes: Number(parsed.other_taxes || base.other_taxes || 0),
        total_amount: Number(parsed.total_amount || base.total_amount || 0),
        currency: (parsed.currency || base.currency || '') as ReceiptExtraction['currency'],
        suggested_classification: '' as ExpenseClassification,
        suggested_category: '',
        confidence_score: Number(parsed.confidence_score || base.confidence_score || 0),
        line_items: Array.isArray(parsed.line_items) && parsed.line_items.length > 0 ? parsed.line_items : base.line_items,
        raw_text: rawText,
        observations: [...new Set([...(base.observations || []), ...(parsed.observations || []), 'Se revisó automáticamente la información leída; revise los campos antes de aprobar.', 'La clasificación contable no se completa automáticamente.'])]
      };

      await prismaRepo.logAIUsage({ organization_id: this.orgId, provider_type: 'GROQ', model: this.model, action: 'EXTRACT_RECEIPT', tokens_prompt: json.usage?.prompt_tokens || 0, tokens_completion: json.usage?.completion_tokens || 0, duration_ms: Date.now() - startTime, status: 'SUCCESS' });
      return extraction;
    } catch (error: any) {
      await prismaRepo.logAIUsage({ organization_id: this.orgId, provider_type: 'GROQ', model: this.model, action: 'EXTRACT_RECEIPT', tokens_prompt: 0, tokens_completion: 0, duration_ms: Date.now() - startTime, status: 'ERROR' });
      throw error;
    }
  }

  async classifyExpense(_data: ReceiptData): Promise<ClassificationSuggestion> {
    return unverifiedClassification();
  }

  async validateExtraction(data: ReceiptData): Promise<ValidationResult> {
    return validateFiscalData(data);
  }

  async getUsage(): Promise<AIUsage> {
    const logs = (await prismaRepo.getAIUsageLogs(this.orgId)).filter(l => l.provider_type === 'GROQ');
    const estimated_cost_usd = logs.reduce((total, log) => {
      const pricing = GROQ_PRICING[normalizeGroqModel(log.model)] || GROQ_PRICING[GROQ_DEFAULT_MODEL];
      return total + (log.tokens_prompt / 1000000) * pricing.input + (log.tokens_completion / 1000000) * pricing.output;
    }, 0);
    return {
      total_requests: logs.length,
      total_tokens: logs.reduce((a, b) => a + b.tokens_prompt + b.tokens_completion, 0),
      estimated_cost_usd: Number(estimated_cost_usd.toFixed(6)),
      average_latency_ms: logs.length > 0 ? Math.round(logs.reduce((a, b) => a + b.duration_ms, 0) / logs.length) : 0
    };
  }
}

// ----------------------------------------------------
// OpenAI Provider (Real HTTP Client with Vision)
// ----------------------------------------------------
export class OpenAIProvider implements AIProvider {
  public providerType: AIProviderType = 'OPENAI';
  private apiKey: string;
  private model: string;
  private orgId: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', orgId: string = 'org_allsender_corp') {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o-mini';
    this.orgId = orgId;
  }

  async testConnection(): Promise<AITestResult> {
    const startTime = Date.now();
    if (!this.apiKey || this.apiKey.trim() === '') {
      return { status: 'INVALID_KEY', message: 'API Key de OpenAI no configurada.', latency_ms: 0 };
    }
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      const duration = Date.now() - startTime;
      if (res.status === 401) return { status: 'INVALID_KEY', message: 'API Key de OpenAI rechazada (401 Unauthorized).', latency_ms: duration };
      if (!res.ok) return { status: 'ERROR', message: `OpenAI retornó HTTP ${res.status}`, latency_ms: duration };
      return { status: 'ONLINE', message: `Conexión verificada exitosamente con OpenAI (${this.model}).`, latency_ms: duration };
    } catch (err: any) {
      return { status: 'ERROR', message: `Error de conexión con OpenAI: ${err.message}`, latency_ms: Date.now() - startTime };
    }
  }

  async extractReceiptData(image: ReceiptImage): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    if (!this.apiKey) throw new Error('API Key de OpenAI no configurada.');

    try {
      const prompt = `Analiza la imagen del comprobante fiscal dominicano y responde en JSON estructurado. Extrae únicamente datos visibles: NCF, RNC, fecha, subtotal, ITBIS, otros impuestos, total, moneda, tipo de documento y líneas. No inventes ni completes valores por defecto. No clasifiques contablemente el gasto ni afirmes deducibilidad fiscal.`;
      const cleanBase64 = image.base64Data.startsWith('data:') ? image.base64Data : `data:${image.mimeType || 'image/jpeg'};base64,${image.base64Data}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: cleanBase64 } }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) throw new Error(`OpenAI API respondió con HTTP ${res.status}`);

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(text) as ReceiptExtraction;
      parsed.suggested_classification = '' as ExpenseClassification;
      parsed.suggested_category = '';

      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'OPENAI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: json.usage?.prompt_tokens || 1200,
        tokens_completion: json.usage?.completion_tokens || 300,
        duration_ms: Date.now() - startTime,
        status: 'SUCCESS'
      });

      return parsed;
    } catch (error: any) {
      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'OPENAI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: 0,
        tokens_completion: 0,
        duration_ms: Date.now() - startTime,
        status: 'ERROR'
      });
      throw error;
    }
  }

  async extractReceiptSessionData(images: ReceiptImage[]): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    if (!this.apiKey) throw new Error('API Key de OpenAI no configurada.');
    try {
      const result = await extractOpenAICompatibleSession({ endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: this.apiKey, model: this.model, images });
      result.extraction.suggested_classification = '' as ExpenseClassification;
      result.extraction.suggested_category = '';
      await prismaRepo.logAIUsage({
        organization_id: this.orgId,
        provider_type: 'OPENAI',
        model: this.model,
        action: 'EXTRACT_RECEIPT',
        tokens_prompt: result.usage.prompt_tokens || 1200 * images.length,
        tokens_completion: result.usage.completion_tokens || 600,
        duration_ms: Date.now() - startTime,
        status: 'SUCCESS'
      });
      return result.extraction;
    } catch (error) {
      await prismaRepo.logAIUsage({ organization_id: this.orgId, provider_type: 'OPENAI', model: this.model, action: 'EXTRACT_RECEIPT', tokens_prompt: 0, tokens_completion: 0, duration_ms: Date.now() - startTime, status: 'ERROR' });
      throw error;
    }
  }

  async classifyExpense(_data: ReceiptData): Promise<ClassificationSuggestion> {
    return unverifiedClassification();
  }

  async validateExtraction(data: ReceiptData): Promise<ValidationResult> {
    return validateFiscalData(data);
  }

  async getUsage(): Promise<AIUsage> {
    const logs = (await prismaRepo.getAIUsageLogs(this.orgId)).filter(l => l.provider_type === 'OPENAI');
    return {
      total_requests: logs.length,
      total_tokens: logs.reduce((a, b) => a + b.tokens_prompt + b.tokens_completion, 0),
      estimated_cost_usd: 0.12,
      average_latency_ms: logs.length > 0 ? Math.round(logs.reduce((a, b) => a + b.duration_ms, 0) / logs.length) : 0
    };
  }
}

// ----------------------------------------------------
// CodeMorf Cloud AI Provider (Managed SaaS Tokens)
// ----------------------------------------------------
export class CodeMorfAIProvider implements AIProvider {
  public providerType: AIProviderType = 'CODEMORF';
  private apiKey: string;
  private model: string;
  private orgId: string;
  private apiUrl: string;

  constructor(apiKey: string = '', model: string = 'codemorf-vision-v1', orgId: string = 'org_allsender_corp') {
    this.apiKey = apiKey || process.env.CODEMORF_API_KEY || '';
    this.model = model || 'codemorf-vision-v1';
    this.orgId = orgId;
    this.apiUrl = process.env.CODEMORF_API_URL || 'https://codemorf.tech/api/v1';
  }

  async testConnection(): Promise<AITestResult> {
    const startTime = Date.now();
    try {
      if (this.apiUrl && this.apiUrl.startsWith('http')) {
        const res = await fetch(`${this.apiUrl}/health`, {
          headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          return {
            status: 'ONLINE',
            message: `Gateway CodeMorf Cloud Activo (${this.model})`,
            latency_ms: Date.now() - startTime
          };
        } else {
          return {
            status: 'OFFLINE',
            message: `Gateway CodeMorf Cloud respondió con error HTTP ${res.status}`,
            latency_ms: Date.now() - startTime
          };
        }
      }
      return {
        status: 'OFFLINE',
        message: 'URL de Gateway CodeMorf Cloud no configurada (CODEMORF_API_URL)',
        latency_ms: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        status: 'OFFLINE',
        message: `Fallo de conexión con Gateway CodeMorf Cloud: ${err.message}`,
        latency_ms: Date.now() - startTime
      };
    }
  }

  async extractReceiptData(image: ReceiptImage): Promise<ReceiptExtraction> {
    const startTime = Date.now();
    try {
      if (this.apiUrl && this.apiUrl.startsWith('http')) {
        const payload = {
          image_base64: image.base64Data,
          mime_type: image.mimeType || 'image/jpeg',
          model: this.model,
          organization_id: this.orgId
        };
        const res = await fetch(`${this.apiUrl}/ocr/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          const ext: ReceiptExtraction = data.extraction || data;
          ext.suggested_classification = '' as ExpenseClassification;
          ext.suggested_category = '';
          await prismaRepo.logAIUsage({
            organization_id: this.orgId,
            provider_type: 'CODEMORF',
            model: this.model,
            action: 'EXTRACT_RECEIPT',
            tokens_prompt: data.usage?.prompt_tokens || 900,
            tokens_completion: data.usage?.completion_tokens || 250,
            duration_ms: Date.now() - startTime,
            status: 'SUCCESS'
          });
          return ext;
        }
      }
    } catch (err: any) {
      console.warn('[CodeMorf AI] Gateway call unreachable, using local fallback:', err.message);
    }

    const geminiEngine = new GeminiAIProvider(this.apiKey || process.env.GEMINI_API_KEY || '', 'gemini-2.5-flash', this.orgId);
    return await geminiEngine.extractReceiptData(image);
  }

  async classifyExpense(_data: ReceiptData): Promise<ClassificationSuggestion> {
    return unverifiedClassification();
  }

  async validateExtraction(data: ReceiptData): Promise<ValidationResult> {
    return validateFiscalData(data);
  }

  async getUsage(): Promise<AIUsage> {
    const logs = (await prismaRepo.getAIUsageLogs(this.orgId)).filter(l => l.provider_type === 'CODEMORF');
    return {
      total_requests: logs.length,
      total_tokens: logs.reduce((a, b) => a + b.tokens_prompt + b.tokens_completion, 0),
      estimated_cost_usd: 0,
      average_latency_ms: 120
    };
  }
}

/**
 * Returns active AI Provider instance for organization or executes real fallback chain
 */
export async function getAIProviderInstance(orgId: string, preferredType?: AIProviderType): Promise<AIProvider> {
  const configs = await prismaRepo.getAIProviderConfigs(orgId);
  const activeConfigs = configs.filter(c => c.is_active && c.has_key);

  const selected = (preferredType ? activeConfigs.find(c => c.provider_type === preferredType) : null)
    || activeConfigs.find(c => c.is_primary)
    || activeConfigs[0];

  if (!selected) {
    return new CodeMorfAIProvider('', 'codemorf-vision-v1', orgId);
  }

  const providerEnvironmentKey = selected.provider_type === 'GEMINI'
    ? process.env.GEMINI_API_KEY
    : selected.provider_type === 'GROQ'
      ? process.env.GROQ_API_KEY
      : '';
  const rawKey = await prismaRepo.getDecryptedAIProviderKey(orgId, selected.id) || providerEnvironmentKey || '';

  switch (selected.provider_type) {
    case 'CODEMORF':
      return new CodeMorfAIProvider(rawKey, selected.selected_model, orgId);
    case 'GROQ':
      return new GroqAIProvider(rawKey, selected.selected_model, orgId);
    case 'OPENAI':
      return new OpenAIProvider(rawKey, selected.selected_model, orgId);
    case 'GEMINI':
    default:
      return new GeminiAIProvider(rawKey, selected.selected_model, orgId);
  }
}

export async function extractReceiptSessionWithAI(
  orgId: string,
  images: ReceiptImage[],
  localExtraction?: ReceiptExtraction
): Promise<{ extraction: ReceiptExtraction; providerUsed: AIProviderType; modelUsed: string } | null> {
  const configs = (await prismaRepo.getAIProviderConfigs(orgId))
    .filter(config => config.is_active && config.has_key)
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary));

  for (const config of configs) {
    const provider = await getAIProviderInstance(orgId, config.provider_type);
    try {
      const extraction = config.provider_type === 'GROQ' && provider.extractReceiptTextData
        ? await provider.extractReceiptTextData(localExtraction?.raw_text || '', localExtraction)
        : provider.extractReceiptSessionData
          ? await provider.extractReceiptSessionData(images)
          : null;
      if (!extraction) continue;
      extraction.suggested_classification = '' as ExpenseClassification;
      extraction.suggested_category = '';
      return { extraction, providerUsed: config.provider_type, modelUsed: config.provider_type === 'GROQ' ? normalizeGroqModel(config.selected_model) : config.selected_model };
    } catch (error: any) {
      console.warn(`[AI Session Chain] Engine ${config.provider_type} failed: ${error.message}. Trying next provider...`);
    }
  }

  if (configs.length === 0 && process.env.GEMINI_API_KEY) {
    try {
      const provider = new GeminiAIProvider(process.env.GEMINI_API_KEY, 'gemini-2.5-flash', orgId);
      const extraction = await provider.extractReceiptSessionData(images);
      return { extraction, providerUsed: 'GEMINI', modelUsed: 'gemini-2.5-flash' };
    } catch (error: any) {
      console.warn(`[AI Session Chain] Environment Gemini failed: ${error.message}. Keeping local OCR result.`);
    }
  }

  if (configs.length === 0 && process.env.GROQ_API_KEY && localExtraction?.raw_text) {
    try {
      const provider = new GroqAIProvider(process.env.GROQ_API_KEY, GROQ_DEFAULT_MODEL, orgId);
      const extraction = await provider.extractReceiptTextData(localExtraction.raw_text, localExtraction);
      return { extraction, providerUsed: 'GROQ', modelUsed: GROQ_DEFAULT_MODEL };
    } catch (error: any) {
      console.warn(`[AI Session Chain] Environment Groq failed: ${error.message}. Keeping local OCR result.`);
    }
  }

  return null;
}

/**
 * Executes Receipt Extraction with Real Fallback Chain Across Active Providers
 */
export async function extractWithFallback(
  orgId: string,
  image: ReceiptImage,
  options: { segmentIndex?: number; localConfidenceThreshold?: number } = {}
): Promise<{ extraction: ReceiptExtraction; providerUsed: OCRProviderUsed; modelUsed: string }> {
  const segmentIndex = options.segmentIndex || 0;
  const localThreshold = options.localConfidenceThreshold || Number(process.env.LOCAL_OCR_CONFIDENCE_THRESHOLD || 78);
  let localExtraction: ReceiptExtraction | null = null;
  let localFailure: Error | null = null;

  if (!/pdf/i.test(image.mimeType)) {
    try {
      localExtraction = await extractWithLocalOCR(image, segmentIndex);
      const usefulStructure = localExtraction.total_amount > 0 && localExtraction.line_items.length > 0;
      if (usefulStructure && localExtraction.confidence_score >= localThreshold) {
        return { extraction: localExtraction, providerUsed: 'TESSERACT', modelUsed: 'tesseract.js-7-spa+eng' };
      }
    } catch (error: any) {
      localFailure = error;
    }
  }

  const configs = (await prismaRepo.getAIProviderConfigs(orgId)).filter(c => c.is_active && c.has_key);
  if (configs.length === 0) {
    const environmentGeminiKey = process.env.GEMINI_API_KEY || '';
    if (environmentGeminiKey) {
      try {
        const defaultGemini = new GeminiAIProvider(environmentGeminiKey, 'gemini-2.5-flash', orgId);
        const extraction = await defaultGemini.extractReceiptData(image);
        return { extraction, providerUsed: 'GEMINI', modelUsed: 'gemini-2.5-flash' };
      } catch (error: any) {
        console.warn(`[AI Chain] Environment Gemini failed: ${error.message}. Using local OCR result...`);
      }
    }
    const environmentGroqKey = process.env.GROQ_API_KEY || '';
    if (environmentGroqKey && localExtraction) {
      try {
        const defaultGroq = new GroqAIProvider(environmentGroqKey, GROQ_DEFAULT_MODEL, orgId);
        const extraction = await defaultGroq.extractReceiptTextData(localExtraction.raw_text, localExtraction);
        return { extraction, providerUsed: 'GROQ', modelUsed: GROQ_DEFAULT_MODEL };
      } catch (error: any) {
        console.warn(`[AI Chain] Environment Groq failed: ${error.message}. Using local OCR result...`);
      }
    }
    if (localExtraction) return { extraction: localExtraction, providerUsed: 'TESSERACT', modelUsed: 'tesseract.js-7-spa+eng' };
    if (localFailure) throw localFailure;
    const extraction = await extractWithLocalOCR(image, segmentIndex);
    return { extraction, providerUsed: 'TESSERACT', modelUsed: 'tesseract.js-7-spa+eng' };
  }

  const sorted = [...configs].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  let lastError: Error | null = null;
  for (const cfg of sorted) {
    try {
      const instance = await getAIProviderInstance(orgId, cfg.provider_type);
      const extraction = cfg.provider_type === 'GROQ' && instance.extractReceiptTextData
        ? await instance.extractReceiptTextData(localExtraction?.raw_text || '', localExtraction || undefined)
        : await instance.extractReceiptData(image);
      extraction.suggested_classification = '' as ExpenseClassification;
      extraction.suggested_category = '';
      extraction.line_items = (extraction.line_items || []).map(item => ({ ...item, segment_index: segmentIndex }));
      return { extraction, providerUsed: cfg.provider_type, modelUsed: cfg.provider_type === 'GROQ' ? normalizeGroqModel(cfg.selected_model) : cfg.selected_model };
    } catch (error: any) {
      console.warn(`[AI Chain] Engine ${cfg.provider_type} failed: ${error.message}. Trying next fallback...`);
      lastError = error;
    }
  }

  if (localExtraction) return { extraction: localExtraction, providerUsed: 'TESSERACT', modelUsed: 'tesseract.js-7-spa+eng' };
  try {
    const extraction = await extractWithLocalOCR(image, segmentIndex);
    return { extraction, providerUsed: 'TESSERACT', modelUsed: 'tesseract.js-7-spa+eng' };
  } catch (finalLocalError: any) {
    throw new Error(`Todos los motores de IA y el OCR local fallaron: ${lastError?.message || localFailure?.message || finalLocalError?.message || 'Error de credencial u OCR'}`);
  }
}
