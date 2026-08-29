import type { ReceiptExtraction } from '../../src/types.ts';

export type ParsedReceiptLineItem = ReceiptExtraction['line_items'][number];

const FOOTER_OR_HEADER = /^(?:R\.?N\.?C\.?|C[EÉ]DULA|E?-?NCF|FACTURA|RECIBO|TICKET|FECHA|TEL[EÉ]FONO|DIRECCI[OÓ]N|CAJER[OA]|SUB\s*TOTAL|TOTAL|ITBIS|IMPUESTO|PROPINA|DESCUENTO|CAMBIO|EFECTIVO|TARJETA|PAGO)\b/i;
const MONEY_TOKEN = String.raw`\d[\d.,]*[.,]\d{2}`;

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
  rawText: string;
  segmentIndex: number;
  confidence: number;
  sku?: string;
}): ParsedReceiptLineItem | null {
  const split = splitSku(input.description);
  const description = split.description.replace(/\s+/g, ' ').trim();
  if (!validDescription(description) || input.total <= 0) return null;
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitPrice = input.unitPrice && input.unitPrice > 0 ? input.unitPrice : input.total / quantity;
  return {
    description,
    sku: input.sku || split.sku,
    quantity,
    unit_price: Number(unitPrice.toFixed(2)),
    itbis_rate: 0,
    total: Number(input.total.toFixed(2)),
    segment_index: input.segmentIndex,
    confidence: Math.max(20, Math.min(98, Math.round(input.confidence))),
    raw_text: input.rawText
  };
}

export function parseReceiptLineItems(rawText: string, segmentIndex = 0): ParsedReceiptLineItem[] {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const items: ParsedReceiptLineItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (FOOTER_OR_HEADER.test(line)) continue;

    // 2 COCA COLA 2LT 95.00 190.00
    let match = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s+(.+?)\\s+(${MONEY_TOKEN})\\s+(${MONEY_TOKEN})$`, 'i'));
    if (match) {
      const quantity = parseReceiptMoney(match[1]);
      const item = createItem({ description: match[2], quantity, unitPrice: parseReceiptMoney(match[3]), total: parseReceiptMoney(match[4]), rawText: line, segmentIndex, confidence: 92 });
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
      const item = createItem({ description: match[1], quantity: 1, unitPrice: total, total, rawText: line, segmentIndex, confidence: 55 });
      if (item) items.push(item);
    }
  }

  return items;
}
