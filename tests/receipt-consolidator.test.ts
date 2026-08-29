import { describe, expect, it } from 'vitest';
import type { ReceiptExtraction } from '../src/types.ts';
import { consolidateReceiptSegments, reconcileReceiptMath } from '../server/services/receipt-consolidator.service.ts';

function extraction(index: number, descriptions: string[], overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    supplier_name: index === 0 ? 'SUPERMERCADO PRUEBA' : '',
    supplier_rnc: index === 0 ? '131892412' : '',
    ncf: index === 0 ? 'B0100000001' : '',
    ncf_type: 'B01',
    date: '2026-08-29',
    subtotal: 0,
    itbis_amount: 0,
    legal_tip_amount: 0,
    other_taxes: 0,
    total_amount: 0,
    currency: 'DOP',
    document_type: 'FACTURA_CREDITO_FISCAL',
    suggested_classification: 'GASTO_OPERATIVO',
    suggested_category: 'Compras',
    confidence_score: 90,
    line_items: descriptions.map((description, itemIndex) => ({
      description,
      quantity: 1,
      unit_price: 100 + index * 10 + itemIndex,
      itbis_rate: 0,
      total: 100 + index * 10 + itemIndex,
      segment_index: index,
      confidence: 90
    })),
    ...overrides
  };
}

describe('multi-segment receipt consolidation', () => {
  for (const count of [1, 2, 10, 20]) {
    it(`consolidates ${count} segment(s) as one receipt`, () => {
      const result = consolidateReceiptSegments(Array.from({ length: count }, (_, index) => ({
        segment_index: index,
        extraction: extraction(index, [`PRODUCTO ${index + 1}`])
      })));
      expect(result.extraction.line_items).toHaveLength(count);
      expect(new Set(result.extraction.line_items.map(item => item.segment_index)).size).toBe(count);
    });
  }

  it('removes only the matching tail/head overlap between consecutive segments', () => {
    const first = extraction(0, ['A', 'B', 'C']);
    const second = extraction(1, ['C', 'D', 'E']);
    first.line_items[2] = { ...first.line_items[2], unit_price: 50, total: 50 };
    second.line_items[0] = { ...second.line_items[0], unit_price: 50, total: 50 };
    const result = consolidateReceiptSegments([
      { segment_index: 0, extraction: first },
      { segment_index: 1, extraction: second }
    ]);
    expect(result.extraction.line_items.map(item => item.description)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.duplicates_removed).toBe(1);
  });

  it('does not deduplicate a legitimate repeated item outside a consecutive overlap boundary', () => {
    const segments = Array.from({ length: 5 }, (_, index) => ({
      segment_index: index,
      extraction: extraction(index, [index === 0 || index === 4 ? 'COCA COLA' : `PRODUCTO ${index}`], {
        line_items: [{ description: index === 0 || index === 4 ? 'COCA COLA' : `PRODUCTO ${index}`, quantity: 1, unit_price: 100, itbis_rate: 0, total: 100, segment_index: index }]
      })
    }));
    const result = consolidateReceiptSegments(segments);
    expect(result.extraction.line_items.filter(item => item.description === 'COCA COLA')).toHaveLength(2);
    expect(result.duplicates_removed).toBe(0);
  });
});

describe('receipt mathematical reconciliation', () => {
  const base = (overrides: Partial<ReceiptExtraction>): ReceiptExtraction => extraction(0, [], overrides);

  it('accepts an exact invoice including ITBIS', () => {
    const result = reconcileReceiptMath(base({
      line_items: [{ description: 'BIEN', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 1000 }],
      subtotal: 1000,
      itbis_amount: 180,
      total_amount: 1180
    }));
    expect(result.is_valid).toBe(true);
    expect(result.calculated_total).toBe(1180);
  });

  it('accepts a two-cent rounding difference', () => {
    const result = reconcileReceiptMath(base({
      line_items: [{ description: 'BIEN', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 1000 }],
      itbis_amount: 180,
      total_amount: 1180.02
    }));
    expect(result.is_valid).toBe(true);
  });

  it('does not add ITBIS a second time when the printed total includes only the applicable tax', () => {
    const result = reconcileReceiptMath(base({
      subtotal: 300,
      itbis_amount: 45.80,
      total_amount: 300
    }));
    expect(result.is_valid).toBe(true);
    expect(result.expected_total).toBe(300);
    expect(result.calculated_total).toBe(300);
    expect(result.difference).toBe(0);
    expect(result.taxes_included_in_total).toBe(true);
  });

  it('rejects a material difference and points to low-confidence segments', () => {
    const result = reconcileReceiptMath(base({
      line_items: [{ description: 'BIEN', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 1000, confidence: 40, segment_index: 3 }],
      itbis_amount: 180,
      total_amount: 1400
    }));
    expect(result.is_valid).toBe(false);
    expect(result.difference).toBe(220);
    expect(result.probable_segment_indexes).toEqual([3]);
  });

  it('applies discounts, ITBIS, legal tip and other taxes in the required order', () => {
    const result = reconcileReceiptMath(base({
      line_items: [{ description: 'SERVICIO', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 1000, discount: 100 }],
      itbis_amount: 162,
      legal_tip_amount: 90,
      other_taxes: 10,
      total_amount: 1162
    }));
    expect(result.is_valid).toBe(true);
    expect(result.discounts).toBe(100);
    expect(result.calculated_total).toBe(1162);
  });

  it('rejects a line edited inconsistently with its quantity and unit price', () => {
    const result = reconcileReceiptMath(base({
      line_items: [{ description: 'BIEN EDITADO', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 900 }],
      itbis_amount: 180,
      total_amount: 1080
    }));
    expect(result.is_valid).toBe(false);
  });
});
