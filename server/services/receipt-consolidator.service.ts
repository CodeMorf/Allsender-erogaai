import type { ReceiptExtraction, ReceiptMathReconciliation } from '../../src/types.ts';
import { normalizeReceiptDescription } from './receipt-line-parser.service.ts';

type ReceiptLineItem = ReceiptExtraction['line_items'][number];

export interface SegmentExtractionInput {
  segment_index: number;
  extraction: ReceiptExtraction;
}

export interface ConsolidatedReceipt {
  extraction: ReceiptExtraction;
  duplicates_removed: number;
  overlap_segments: Array<{ previous_segment_index: number; current_segment_index: number; removed: number }>;
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[right.length];
}

export function receiptTextSimilarity(left: string, right: string): number {
  const a = normalizeReceiptDescription(left);
  const b = normalizeReceiptDescription(right);
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function closeAmount(left?: number, right?: number, tolerance = 0.02): boolean {
  if (left === undefined || right === undefined) return true;
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

export function areOverlapItemsEquivalent(left: ReceiptLineItem, right: ReceiptLineItem): boolean {
  const exactSku = Boolean(left.sku && right.sku && left.sku === right.sku);
  const leftDescription = normalizeReceiptDescription(left.description);
  const rightDescription = normalizeReceiptDescription(right.description);
  const exactDescription = leftDescription === rightDescription;
  const descriptionSimilarity = receiptTextSimilarity(left.description, right.description);
  const credibleFuzzyMatch = Math.min(leftDescription.length, rightDescription.length) >= 8 && descriptionSimilarity >= 0.92;
  if (!exactSku && !exactDescription && !credibleFuzzyMatch) return false;
  const valuesMatch = closeAmount(left.quantity, right.quantity, 0.001)
    && closeAmount(left.unit_price, right.unit_price)
    && closeAmount(left.total, right.total);
  return valuesMatch && (exactSku || exactDescription || credibleFuzzyMatch);
}

export function findConsecutiveOverlap(previous: ReceiptLineItem[], current: ReceiptLineItem[], maxWindow = 8): number {
  const limit = Math.min(maxWindow, previous.length, current.length);
  for (let size = limit; size >= 1; size -= 1) {
    const tail = previous.slice(previous.length - size);
    const head = current.slice(0, size);
    if (tail.every((item, index) => areOverlapItemsEquivalent(item, head[index]))) return size;
  }
  return 0;
}

function firstText(segments: SegmentExtractionInput[], field: keyof ReceiptExtraction): string {
  for (const segment of segments) {
    const value = segment.extraction[field];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function lastNumber(segments: SegmentExtractionInput[], field: keyof ReceiptExtraction): number {
  for (const segment of [...segments].reverse()) {
    const value = segment.extraction[field];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function consolidateReceiptSegments(inputs: SegmentExtractionInput[]): ConsolidatedReceipt {
  const segments = [...inputs].sort((a, b) => a.segment_index - b.segment_index);
  if (segments.length === 0) throw new Error('No hay segmentos procesados para consolidar.');

  const lineItems: ReceiptLineItem[] = [];
  const overlaps: ConsolidatedReceipt['overlap_segments'] = [];
  let duplicatesRemoved = 0;
  let previousItems: ReceiptLineItem[] = [];

  for (const segment of segments) {
    const currentItems = (segment.extraction.line_items || []).map(item => ({ ...item, segment_index: segment.segment_index }));
    const overlap = findConsecutiveOverlap(previousItems, currentItems);
    if (overlap > 0) {
      duplicatesRemoved += overlap;
      overlaps.push({
        previous_segment_index: segment.segment_index - 1,
        current_segment_index: segment.segment_index,
        removed: overlap
      });
    }
    lineItems.push(...currentItems.slice(overlap));
    previousItems = currentItems;
  }

  const confidence = Math.round(segments.reduce((sum, segment) => sum + Number(segment.extraction.confidence_score || 0), 0) / segments.length);
  const last = segments.at(-1)!.extraction;
  const first = segments[0].extraction;
  const extraction: ReceiptExtraction = {
    supplier_name: firstText(segments, 'supplier_name'),
    supplier_rnc: firstText(segments, 'supplier_rnc').replace(/\D/g, ''),
    ncf: firstText(segments, 'ncf'),
    ncf_type: (firstText(segments, 'ncf_type') || first.ncf_type || 'B01') as ReceiptExtraction['ncf_type'],
    date: firstText(segments, 'date') || first.date,
    subtotal: lastNumber(segments, 'subtotal'),
    itbis_amount: lastNumber(segments, 'itbis_amount'),
    legal_tip_amount: lastNumber(segments, 'legal_tip_amount'),
    other_taxes: lastNumber(segments, 'other_taxes'),
    total_amount: lastNumber(segments, 'total_amount'),
    currency: last.currency || first.currency || 'DOP',
    document_type: first.document_type || last.document_type,
    suggested_classification: first.suggested_classification || last.suggested_classification,
    suggested_category: first.suggested_category || last.suggested_category,
    confidence_score: confidence,
    line_items: lineItems,
    raw_text: segments.map(segment => `[SEGMENTO ${segment.segment_index + 1}]\n${segment.extraction.raw_text || ''}`).join('\n'),
    observations: [
      ...new Set(segments.flatMap(segment => segment.extraction.observations || [])),
      `Consolidado desde ${segments.length} segmento(s).`,
      `${duplicatesRemoved} línea(s) duplicada(s) de solapamiento eliminada(s).`
    ]
  };

  return { extraction, duplicates_removed: duplicatesRemoved, overlap_segments: overlaps };
}

export function reconcileReceiptMath(extraction: ReceiptExtraction): ReceiptMathReconciliation {
  const lineItems = extraction.line_items || [];
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const discounts = lineItems.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const base = lineItems.length > 0 ? lineItemsTotal : Number(extraction.subtotal || 0);
  const calculated = base
    - discounts
    + Number(extraction.itbis_amount || 0)
    + Number(extraction.legal_tip_amount || 0)
    + Number(extraction.other_taxes || 0);
  const expected = Number(extraction.total_amount || 0);
  const difference = Number((expected - calculated).toFixed(2));
  const tolerance = 0.02;
  const probableSegments = [...new Set(
    lineItems
      .filter(item => Number(item.confidence ?? 100) < 70)
      .map(item => Number(item.segment_index ?? 0))
  )];

  return {
    is_valid: expected > 0 && Math.abs(difference) <= tolerance,
    expected_total: Number(expected.toFixed(2)),
    calculated_total: Number(calculated.toFixed(2)),
    difference,
    tolerance,
    line_items_total: Number(lineItemsTotal.toFixed(2)),
    discounts: Number(discounts.toFixed(2)),
    probable_segment_indexes: probableSegments
  };
}
