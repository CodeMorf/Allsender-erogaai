import type { ReceiptExtraction } from '../../src/types.ts';

export type ParsedReceiptLineItem = ReceiptExtraction['line_items'][number];

const FOOTER_OR_HEADER = /^(?:R\.?\s*N\.?\s*C\.?|C[EÉ]DULA|E?-?NCF|FACTURA|RECIBO|TICKET|FECHA|TEL(?:[ÉE]FONO)?|DIRECCI[OÓ]N|CALLE|AV(?:ENIDA)?\.?|CAJER[OA]|SUB\s*TOTAL|TOTAL|ITBIS|IBIS|IVA|TAX|MAS\s+(?:ITBIS|IBIS)|IMPUESTO|PROPINA|DESCUENTO|CAMBIO|EFECTIVO|TARJETA|PAGO|CANT(?:IDAD)?|DESCRIPC|UNIDAD|UND|VTA|COSTO|PRECIO|IMPORTE|SECTOR|CIUDAD|US|RD|DOP|USD)\b/i;
const MONEY_TOKEN = String.raw`\d[\d.,]*[.,]\d{2}`;

function normalizeLineForParsing(line: string): string {
  return (line || '')
    .replace(/["'|]/g, '')
    .replace(/(?:RD|DOP|USD?|US)\s*\$/gi, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decimalTokens(line: string): number[] {
  return (line.match(new RegExp(MONEY_TOKEN, 'g')) || []).map(parseReceiptMoney);
}

function leadingQuantity(value: string): { quantity: number; description: string } | null {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!match) return null;
  const quantity = parseReceiptMoney(match[1]);
  return quantity > 0 ? { quantity, description: match[2].trim() } : null;
}

function parseQuantityDetailRow(line: string): { quantity: number; values: number[] } | null {
  const normalized = normalizeLineForParsing(line);
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s+(?:UNIDAD(?:ES)?|UNID?\.?|UND(?:AD)?\.?|NIDAD|PZA|PCS?)(?:\s+|$)(.*)$/i);
  if (!match) return null;
  const quantity = parseReceiptMoney(match[1]);
  const values = decimalTokens(match[2]);
  return quantity > 0 && values.length > 0 ? { quantity, values } : null;
}

export function parseReceiptMoney(raw: string): number {
  let value = (raw || '').replace(/[^0-9,.-]/g, '');
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    value = lastComma > lastDot
      ? value.replace(/\./g, '').replace(',', '.')
      : value.replace(/,/g, '');
  } else if (lastComma >= 0) {
    value = value.length - lastComma - 1 === 2 ? value.replace(',', '.') : value.replace(/,/g, '');
  } else if (lastDot >= 0 && value.length - lastDot - 1 !== 2) {
    value = value.replace(/\./g, '');
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeReceiptDescription(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function splitSku(description: string): { sku?: string; description: string } {
  const match = description.trim().match(/^(\d{4,})\s+(.+)$/);
  if (!match) return { description: description.trim() };
  return { sku: match[1], description: match[2].trim() };
}

function validDescription(value: string): boolean {
  const normalized = normalizeReceiptDescription(value);
  return normalized.length >= 2
    && /[A-Z]/.test(normalized)
    && !FOOTER_OR_HEADER.test(normalized);
}

function createItem(input: {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
  itbisAmount?: number;
  rawText: string;
  segmentIndex: number;
  confidence: number;
  sku?: string;
}): ParsedReceiptLineItem | null {
  const split = splitSku(input.description);
  const description = split.description.replace(/\s+/g, ' ').trim();
  if (!validDescription(description) || !Number.isFinite(input.total) || input.total < 0) return null;
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitPrice = input.unitPrice !== undefined && Number.isFinite(input.unitPrice) && input.unitPrice >= 0
    ? input.unitPrice
    : input.total / quantity;
  return {
    description,
    sku: input.sku || split.sku,
    quantity,
    unit_price: Number(unitPrice.toFixed(2)),
    itbis_rate: 0,
    total: Number(input.total.toFixed(2)),
    ...(input.itbisAmount !== undefined && input.itbisAmount > 0 ? { itbis_amount: Number(input.itbisAmount.toFixed(2)) } : {}),
    segment_index: input.segmentIndex,
    confidence: Math.max(20, Math.min(98, Math.round(input.confidence))),
    raw_text: input.rawText
  };
}

export function parseReceiptLineItems(rawText: string, segmentIndex = 0): ParsedReceiptLineItem[] {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(normalizeLineForParsing)
    .filter(Boolean);
  const items: ParsedReceiptLineItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (FOOTER_OR_HEADER.test(line)) continue;

    // POS layouts often print the description on one line and the quantity/unit
    // row immediately below it, e.g. "TORNILLO..." + "20 UNIDAD 45.80 300.00".
    const nextDetail = index + 1 < lines.length ? parseQuantityDetailRow(lines[index + 1]) : null;
    if (validDescription(line) && nextDetail) {
      const total = nextDetail.values.at(-1) || 0;
      const item = createItem({
        description: line,
        quantity: nextDetail.quantity,
        unitPrice: total / nextDetail.quantity,
        total,
        rawText: `${line}\n${lines[index + 1]}`,
        segmentIndex,
        confidence: 72
      });
      if (item) items.push(item);
      index += 1;
      continue;
    }

    // OCR can emit the amount on a separate line from the description.
    if (validDescription(line) && index + 1 < lines.length) {
      const amountLine = lines[index + 1];
      const amounts = decimalTokens(amountLine);
      if (amounts.length === 1 && /^\s*\d[\d.,]*[.,]\d{2}\s*$/i.test(amountLine)) {
        const quantityData = leadingQuantity(line);
        const item = createItem({
          description: quantityData?.description || line,
          quantity: quantityData?.quantity,
          total: amounts[0],
          rawText: `${line}\n${amountLine}`,
          segmentIndex,
          confidence: 62
        });
        if (item) items.push(item);
        index += 1;
        continue;
      }
    }

    // 2 COCA COLA 2LT 95.00 190.00
    let match = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s+(.+?)\\s+(${MONEY_TOKEN})\\s+(${MONEY_TOKEN})$`, 'i'));
    if (match) {
      const quantity = parseReceiptMoney(match[1]);
      const item = createItem({ description: match[2], quantity, unitPrice: parseReceiptMoney(match[3]), total: parseReceiptMoney(match[4]), rawText: line, segmentIndex, confidence: 92 });
      if (item) items.push(item);
      continue;
    }

    // 3 AGUA DASANI 150.00 or 2 ROLLO PECHURINITAS 669.48.
    // The amount is the line total; derive unit price from the quantity.
    match = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s+(.+?)\\s+(${MONEY_TOKEN})$`, 'i'));
    if (match && !/^\d{4,}\s+/.test(line)) {
      const quantity = parseReceiptMoney(match[1]);
      const total = parseReceiptMoney(match[3]);
      const item = createItem({ description: match[2], quantity, total, rawText: line, segmentIndex, confidence: 78 });
      if (item) items.push(item);
      continue;
    }

    // COCA COLA 2LT 2 x 95.00 190.00
    match = line.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*[xX*]\\s*(${MONEY_TOKEN})(?:\\s+(${MONEY_TOKEN}))?$`, 'i'));
    if (match) {
      const quantity = parseReceiptMoney(match[2]);
      const unitPrice = parseReceiptMoney(match[3]);
      const total = match[4] ? parseReceiptMoney(match[4]) : quantity * unitPrice;
      const item = createItem({ description: match[1], quantity, unitPrice, total, rawText: line, segmentIndex, confidence: match[4] ? 94 : 82 });
      if (item) items.push(item);
      continue;
    }

    // 123456 ARROZ SELECTO 1 75.50
    match = line.match(new RegExp(`^(\\d{4,})\\s+(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s+(${MONEY_TOKEN})$`, 'i'));
    if (match) {
      const quantity = parseReceiptMoney(match[3]);
      const total = parseReceiptMoney(match[4]);
      const item = createItem({ sku: match[1], description: match[2], quantity, unitPrice: total / Math.max(quantity, 1), total, rawText: line, segmentIndex, confidence: 78 });
      if (item) items.push(item);
      continue;
    }

    // Two-line item: description followed by "2 x 65.00 130.00".
    if (validDescription(line) && index + 1 < lines.length) {
      const detail = lines[index + 1];
      match = detail.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*[xX*]\\s*(${MONEY_TOKEN})(?:\\s+(${MONEY_TOKEN}))?$`, 'i'));
      if (match) {
        const quantity = parseReceiptMoney(match[1]);
        const unitPrice = parseReceiptMoney(match[2]);
        const total = match[3] ? parseReceiptMoney(match[3]) : quantity * unitPrice;
        const item = createItem({ description: line, quantity, unitPrice, total, rawText: `${line}\n${detail}`, segmentIndex, confidence: match[3] ? 90 : 80 });
        if (item) items.push(item);
        index += 1;
        continue;
      }
    }

    // Last-resort product line with explicit amount. Quantity is unknown.
    match = line.match(new RegExp(`^(.+?)\\s+(${MONEY_TOKEN})$`, 'i'));
    if (match && validDescription(match[1])) {
      const total = parseReceiptMoney(match[2]);
      const quantityData = leadingQuantity(match[1]);
      const item = createItem({
        description: quantityData?.description || match[1],
        quantity: quantityData?.quantity,
        unitPrice: quantityData ? total / quantityData.quantity : total,
        total,
        rawText: line,
        segmentIndex,
        confidence: 55
      });
      if (item) items.push(item);
    }
  }

  return items;
}
