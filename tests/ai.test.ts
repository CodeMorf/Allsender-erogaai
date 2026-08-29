import { describe, it, expect } from 'vitest';
import { validateFiscalData, GeminiAIProvider, parseLocalOCRText } from '../server/ai-providers.ts';

describe('AI & Fiscal Validation Rules', () => {
  it('validates Dominican RNC formats correctly', () => {
    const validResult = validateFiscalData({
      supplier_name: 'Test SRL',
      supplier_rnc: '101-00157-7',
      ncf: 'B0100000001',
      subtotal: 1000,
      itbis_amount: 180,
      total_amount: 1180
    });

    expect(validResult.is_valid).toBe(true);
    expect(validResult.rnc_valid).toBe(true);
    expect(validResult.errors.length).toBe(0);
  });

  it('flags invalid RNC lengths', () => {
    const invalidResult = validateFiscalData({
      supplier_name: 'Test SRL',
      supplier_rnc: '12345', // 5 digits
      ncf: 'B0100000001',
      subtotal: 1000,
      itbis_amount: 180,
      total_amount: 1180
    });

    expect(invalidResult.rnc_valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('handles unconfigured AI Key test status cleanly without fake ONLINE success', async () => {
    const provider = new GeminiAIProvider('', 'gemini-2.5-flash', 'test_org');
    const result = await provider.testConnection();

    expect(result.status).toBe('INVALID_KEY');
    expect(result.status).not.toBe('ONLINE');
  });

  it('extracts Dominican receipt fields with the free local OCR parser', () => {
    const result = parseLocalOCRText(`
      SUPERMERCADO NACIONAL
      RNC: 101-12345-6
      NCF: B0100000123
      Fecha: 29/08/2026
      Subtotal RD$ 1,000.00
      ITBIS RD$ 180.00
      TOTAL A PAGAR RD$ 1,180.00
    `, 82);

    expect(result.supplier_name).toBe('SUPERMERCADO NACIONAL');
    expect(result.supplier_rnc).toBe('101123456');
    expect(result.ncf).toBe('B0100000123');
    expect(result.date).toBe('2026-08-29');
    expect(result.subtotal).toBe(1000);
    expect(result.itbis_amount).toBe(180);
    expect(result.total_amount).toBe(1180);
    expect(result.confidence_score).toBe(78);
    expect(result.observations?.[0]).toContain('Tesseract.js');
  });

  it('does not invent today as the receipt date when OCR did not find one', () => {
    const result = parseLocalOCRText(`
      SUPPLIER WITHOUT DATE
      RNC: 101-12345-6
      NCF: B0100000123
      TOTAL: RD$ 100.00
    `, 82);

    expect(result.date).toBe('');
  });

  it('reads an OCR tax label variant and a value printed on the following line', () => {
    const result = parseLocalOCRText(`
      F. MADE CENTRAL, SRL
      RNC: 101-19154-5
      FECHA:
      28/08/2026
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
  });
});
