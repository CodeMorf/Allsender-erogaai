import { describe, expect, it } from 'vitest';
import { parseReceiptLineItems, parseReceiptMoney } from '../server/services/receipt-line-parser.service.ts';

describe('local receipt line parser', () => {
  it('parses quantity-first, multiplier, SKU and two-line product formats', () => {
    const items = parseReceiptLineItems(`
2 COCA COLA 2LT 95.00 190.00
JUGO NARANJA 3 x 40.00 120.00
123456 ARROZ SELECTO 1 75.50
LECHE ENTERA
2 x 65.00 130.00
`, 4);

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ description: 'COCA COLA 2LT', quantity: 2, unit_price: 95, total: 190, segment_index: 4 });
    expect(items[1]).toMatchObject({ description: 'JUGO NARANJA', quantity: 3, unit_price: 40, total: 120 });
    expect(items[2]).toMatchObject({ sku: '123456', description: 'ARROZ SELECTO', quantity: 1, unit_price: 75.5, total: 75.5 });
    expect(items[3]).toMatchObject({ description: 'LECHE ENTERA', quantity: 2, unit_price: 65, total: 130 });
    expect(items.every(item => item.raw_text && Number(item.confidence) > 0)).toBe(true);
  });

  it('uses quantity 1 with lower confidence only when an explicit line amount exists', () => {
    const items = parseReceiptLineItems('SERVICIO DE ENTREGA 250.00', 0);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantity: 1, unit_price: 250, total: 250, confidence: 55 });
    expect(parseReceiptLineItems('TEXTO SIN PRECIO')).toEqual([]);
  });

  it('normalizes Dominican and international money separators without inventing values', () => {
    expect(parseReceiptMoney('RD$ 1,234.56')).toBe(1234.56);
    expect(parseReceiptMoney('1.234,56')).toBe(1234.56);
    expect(parseReceiptMoney('sin monto')).toBe(0);
  });
});
