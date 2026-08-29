import { describe, expect, it } from 'vitest';
import { parseReceiptLineItems, parseReceiptMoney } from '../server/services/receipt-line-parser.service.ts';
import { parseLocalOCRText } from '../server/ai-providers.ts';

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

  it('parses restaurant receipt lines with a leading quantity, currency and zero-value concepts', () => {
    const result = parseLocalOCRText(`
      Dominican Food Investment
      La Marina
      Pollos Victorina
      RNC: 131163041
      3 Agua Dasani $150.00
      2 Rollo Pechurinitas $669.48
      2 *Llevar Rollos $0.00
      1 Combo 3 Piezas $419.49
      1 *Agranda Grande TakeOut $42.37
      1 Combo 5 Pechurinas $419.49
      1 *Agranda Grande TakeOut $42.37
      Total Neto: $1,743.21
      ITBIS: $286.78
      TOTAL: $2,029.99
      Fecha de emision: 26-08-2026
      e-NCF: E310000124607
    `, 82);

    expect(result).toMatchObject({
      supplier_name: 'Pollos Victorina',
      supplier_rnc: '131163041',
      ncf: 'E310000124607',
      ncf_type: 'E31',
      date: '2026-08-26',
      subtotal: 1743.21,
      itbis_amount: 286.78,
      total_amount: 2029.99
    });
    expect(result.line_items).toHaveLength(7);
    expect(result.line_items[0]).toMatchObject({ description: 'Agua Dasani', quantity: 3, total: 150 });
    expect(result.line_items.some(item => item.description === '*Llevar Rollos' && item.total === 0)).toBe(true);
  });

  it('parses a POS column layout with a separate description and quantity row', () => {
    const result = parseLocalOCRText(`
      F. MADE CENTRAL, SRL
      RNC: 101-19154-5
      NCF: B01000048305
      FECHA: 28/08/2026
      CANT. DESCRIPC. UND VTA ITBIS IMPORTE
      TORNILLO MECANICO DE 3/8X1 1/2
      20 UNIDAD 45.80 300.00
      SUBTOTAL: 254.20
      MAS ITBIS: 45.80
      TOTAL: 300.00
    `, 82);

    expect(result).toMatchObject({
      supplier_name: 'F. MADE CENTRAL, SRL',
      supplier_rnc: '101191545',
      ncf: 'B01000048305',
      date: '2026-08-28',
      subtotal: 254.2,
      itbis_amount: 45.8,
      total_amount: 300
    });
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]).toMatchObject({
      description: 'TORNILLO MECANICO DE 3/8X1 1/2',
      quantity: 20,
      unit_price: 12.71,
      total: 254.2,
      itbis_amount: 45.8
    });
  });

  it('handles labels and amounts split across lines without treating tax as a product', () => {
    const result = parseLocalOCRText(`
      F. MADE CENTRAL, SRL
      RNC: 101-19154-5
      FECHA:
      28/08/2026
      TORNILLO MECANICO DE 3/8X1 1/2
      20 UNIDAD 45.80 300.00
      SUBTOTAL
      254.20
      US 45.80
      TOTAL
      300.00
    `, 70);

    expect(result.date).toBe('2026-08-28');
    expect(result.subtotal).toBe(254.2);
    expect(result.itbis_amount).toBe(45.8);
    expect(result.total_amount).toBe(300);
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]).toMatchObject({ description: 'TORNILLO MECANICO DE 3/8X1 1/2', total: 254.2, itbis_amount: 45.8 });
  });
});
