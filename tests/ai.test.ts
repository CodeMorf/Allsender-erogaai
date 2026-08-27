import { describe, it, expect } from 'vitest';
import { validateFiscalData, GeminiAIProvider } from '../server/ai-providers.ts';

describe('AI & Fiscal Validation Rules', () => {
  it('validates Dominican RNC formats correctly', () => {
    const validResult = validateFiscalData({
      supplier_name: 'Test SRL',
      supplier_rnc: '131-89241-2',
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
});
