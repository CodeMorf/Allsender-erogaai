import type { ReceiptExtraction, ReceiptSessionRecord } from '../../src/types.ts';
import { extractReceiptSessionWithAI, extractWithLocalOCR, validateFiscalData, type ReceiptImage } from '../ai-providers.ts';
import { prismaRepo, RepositoryError } from '../database/prisma.repository.ts';
import { consolidateReceiptSegments, findConsecutiveOverlap, reconcileReceiptMath } from './receipt-consolidator.service.ts';
import { supplierResolutionService } from './supplier-resolution.service.ts';

const LOCAL_REVIEW_THRESHOLD = Number(process.env.LOCAL_OCR_CONFIDENCE_THRESHOLD || 78);

function deduplicateAIOverlap(extraction: ReceiptExtraction): { extraction: ReceiptExtraction; duplicates: number } {
  const items = extraction.line_items || [];
  if (!items.some(item => item.segment_index !== undefined)) return { extraction, duplicates: 0 };
  const indexes = [...new Set(items.map(item => Number(item.segment_index || 0)))].sort((a, b) => a - b);
  const output: typeof items = [];
  let previous: typeof items = [];
  let duplicates = 0;
  for (const index of indexes) {
    const current = items.filter(item => Number(item.segment_index || 0) === index);
    const overlap = findConsecutiveOverlap(previous, current);
    duplicates += overlap;
    output.push(...current.slice(overlap));
    previous = current;
  }
  return { extraction: { ...extraction, line_items: output }, duplicates };
}

function mergeAIWithLocal(local: ReceiptExtraction | undefined, ai: ReceiptExtraction): ReceiptExtraction {
  if (!local) return ai;
  const preferText = (candidate: string | undefined, fallback: string) => candidate?.trim() || fallback;
  const preferPositive = (candidate: number | undefined, fallback: number) => Number(candidate || 0) > 0 ? Number(candidate) : fallback;
  return {
    ...local,
    ...ai,
    supplier_name: preferText(ai.supplier_name, local.supplier_name),
    supplier_rnc: preferText(ai.supplier_rnc, local.supplier_rnc),
    ncf: preferText(ai.ncf, local.ncf),
    date: preferText(ai.date, local.date),
    ncf_type: ai.ncf_type || local.ncf_type,
    currency: ai.currency || local.currency,
    document_type: ai.document_type || local.document_type,
    suggested_classification: ai.suggested_classification || local.suggested_classification,
    suggested_category: ai.suggested_category || local.suggested_category,
    subtotal: preferPositive(ai.subtotal, local.subtotal),
    itbis_amount: preferPositive(ai.itbis_amount, local.itbis_amount),
    legal_tip_amount: preferPositive(ai.legal_tip_amount, local.legal_tip_amount),
    other_taxes: preferPositive(ai.other_taxes, local.other_taxes),
    total_amount: preferPositive(ai.total_amount, local.total_amount),
    confidence_score: preferPositive(ai.confidence_score, local.confidence_score),
    line_items: ai.line_items?.length ? ai.line_items : local.line_items,
    raw_text: ai.raw_text?.trim() || local.raw_text,
    observations: [...new Set([...(local.observations || []), ...(ai.observations || [])])]
  };
}

export class ReceiptSessionService {
  async process(orgId: string, sessionId: string): Promise<ReceiptSessionRecord> {
    const session = await prismaRepo.getReceiptSessionById(orgId, sessionId, true);
    if (!session) throw new Error('Sesión de comprobante no encontrada.');
    if (session.segments.length === 0) throw new Error('Agregue al menos un segmento antes de procesar.');
    if (session.segments.length > 20) throw new Error('La sesión excede el máximo de 20 segmentos.');
    if (session.status === 'PROCESSING') throw new RepositoryError('La sesión ya se está procesando.', 409, 'RECEIPT_SESSION_PROCESSING');
    if (session.status === 'SAVED') throw new RepositoryError('El comprobante ya fue guardado como gasto.', 409, 'RECEIPT_SESSION_SAVED');

    await prismaRepo.beginReceiptSessionProcessing(orgId, sessionId);
    const localSegments: Array<{ segment_index: number; extraction: ReceiptExtraction }> = [];
    const images: ReceiptImage[] = [];
    let hasLowConfidenceSegment = false;

    try {
      for (const segment of session.segments) {
        const imagePayload = segment.image_base64 || segment.image_url;
        if (!imagePayload) {
          hasLowConfidenceSegment = true;
          await prismaRepo.updateReceiptSegmentOcr(orgId, sessionId, segment.id, { status: 'FAILED', error: 'El segmento no contiene una imagen disponible.' });
          continue;
        }
        const image: ReceiptImage = { base64Data: imagePayload, mimeType: segment.mime_type, filename: segment.file_name };
        images.push(image);
        await prismaRepo.updateReceiptSegmentOcr(orgId, sessionId, segment.id, { status: 'OCR_PROCESSING', error: '' });
        try {
          const extraction = await extractWithLocalOCR(image, segment.segment_index);
          const lowConfidence = extraction.confidence_score < LOCAL_REVIEW_THRESHOLD || extraction.line_items.length === 0;
          hasLowConfidenceSegment ||= lowConfidence;
          localSegments.push({ segment_index: segment.segment_index, extraction });
          await prismaRepo.updateReceiptSegmentOcr(orgId, sessionId, segment.id, {
            status: lowConfidence ? 'LOW_CONFIDENCE' : 'OCR_COMPLETED',
            ocr_text: extraction.raw_text,
            extraction,
            confidence: extraction.confidence_score,
            error: ''
          });
        } catch (error: any) {
          hasLowConfidenceSegment = true;
          await prismaRepo.updateReceiptSegmentOcr(orgId, sessionId, segment.id, { status: 'FAILED', error: error.message || 'No se pudo leer el comprobante.' });
        }
      }

      let localConsolidated = localSegments.length > 0 ? consolidateReceiptSegments(localSegments) : null;
      let finalExtraction = localConsolidated?.extraction;
      let providerUsed = 'TESSERACT';
      let modelUsed = 'tesseract.js-7-spa+eng';
      let duplicatesRemoved = localConsolidated?.duplicates_removed || 0;
      let aiUsed = false;
      const localReconciliation = finalExtraction ? reconcileReceiptMath(finalExtraction) : null;
      const needsAI = !finalExtraction
        || hasLowConfidenceSegment
        || finalExtraction.confidence_score < LOCAL_REVIEW_THRESHOLD
        || !localReconciliation?.is_valid;

      if (needsAI && images.length > 0) {
        const aiResult = await extractReceiptSessionWithAI(orgId, images, finalExtraction);
        if (aiResult) {
          const mergedExtraction = mergeAIWithLocal(finalExtraction, aiResult.extraction);
          const deduplicated = deduplicateAIOverlap({
            ...mergedExtraction,
            line_items: (mergedExtraction.line_items || []).map(item => ({
              ...item,
              confidence: item.confidence ?? aiResult.extraction.confidence_score
            }))
          });
          finalExtraction = deduplicated.extraction;
          providerUsed = aiResult.providerUsed;
          modelUsed = aiResult.modelUsed;
          duplicatesRemoved = Math.max(duplicatesRemoved, deduplicated.duplicates);
          aiUsed = true;
        }
      }

      if (!finalExtraction) throw new Error('Ningún motor pudo extraer información de los segmentos.');

      const supplierResolution = await supplierResolutionService.resolve(orgId, finalExtraction.supplier_rnc, finalExtraction.supplier_name);
      if (supplierResolution.supplier) {
        finalExtraction = {
          ...finalExtraction,
          supplier_name: supplierResolution.supplier.name,
          supplier_rnc: supplierResolution.supplier.rnc_normalized || supplierResolution.supplier.rnc.replace(/\D/g, '')
        };
      }

      const fiscalValidation = validateFiscalData(finalExtraction);
      const reconciliation = reconcileReceiptMath(finalExtraction);
      const supplierValidated = ['EXISTING', 'CREATED'].includes(supplierResolution.status);
      const supplierIsActive = supplierResolution.dgii_status === 'ACTIVO';
      const reviewRequired = !fiscalValidation.is_valid
        || !reconciliation.is_valid
        || !supplierValidated
        || !supplierIsActive
        || finalExtraction.confidence_score < 75
        || (hasLowConfidenceSegment && !aiUsed);

      return await prismaRepo.updateReceiptSession(orgId, sessionId, {
        status: reviewRequired ? 'REVIEW_REQUIRED' : 'PROCESSED',
        supplier_id: supplierResolution.supplier?.id,
        extraction: finalExtraction,
        fiscal_validation: fiscalValidation,
        reconciliation,
        supplier_resolution: supplierResolution,
        segments_count: session.segments.length,
        duplicates_removed: duplicatesRemoved,
        error: '',
        meta: {
          provider_used: providerUsed,
          model_used: modelUsed,
          local_ocr_segments: localSegments.length,
          ai_used: aiUsed,
          overlap_segments: localConsolidated?.overlap_segments || []
        }
      });
    } catch (error: any) {
      await prismaRepo.updateReceiptSession(orgId, sessionId, { status: 'FAILED', error: error.message || 'Error al procesar la sesión.' });
      throw error;
    }
  }
}

export const receiptSessionService = new ReceiptSessionService();
