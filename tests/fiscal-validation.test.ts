import { describe, expect, it } from 'vitest';
import { validateDominicanNcf } from '../src/utils/fiscalValidators.ts';
import { normalizeItbisRate } from '../src/utils/fiscalTaxes.ts';
import { validateFiscalData } from '../server/services/fiscal-validation.service.ts';

const validBase = {
  supplier_rnc: '101001577',
  ncf: 'B0100000001',
  ncf_type: 'B01' as const,
  subtotal: 1000,
  itbis_amount: 180,
  legal_tip_amount: 0,
  other_taxes: 0,
  total_amount: 1180
};

describe('fiscal validation hard gates', () => {
  it('preserves explicit ITBIS rates including zero', () => {
    expect(normalizeItbisRate(0)).toBe(0);
    expect(normalizeItbisRate(16)).toBe(16);
    expect(normalizeItbisRate(18)).toBe(18);
  });

  it('accepts every supported traditional and electronic NCF prefix', () => {
    for (const prefix of ['B01', 'B02', 'B11', 'B14', 'B15', 'B16']) {
      expect(validateDominicanNcf(`${prefix}00000001`).isValid).toBe(true);
    }
    for (const prefix of ['E31', 'E32', 'E44', 'E45']) {
      expect(validateDominicanNcf(`${prefix}0000000001`).isValid).toBe(true);
    }
  });

  it('makes missing and malformed NCFs hard failures', () => {
    expect(validateFiscalData({ ...validBase, ncf: '' }).ncf_valid).toBe(false);
    expect(validateFiscalData({ ...validBase, ncf: 'B9900000001' }).is_valid).toBe(false);
    expect(validateFiscalData({ ...validBase, ncf: 'B9900000001' }).errors.join(' ')).toContain('NCF');
  });

  it('rejects a line total that does not reconcile with the final invoice total', () => {
    const result = validateFiscalData({
      ...validBase,
      subtotal: 900,
      total_amount: 1180,
      line_items: [{ description: 'BIEN EDITADO', quantity: 1, unit_price: 900, itbis_rate: 18, total: 900 }]
    });
    expect(result.math_valid).toBe(false);
    expect(result.is_valid).toBe(false);
  });

  it('includes discounts, legal tip and other taxes in the fiscal calculation', () => {
    const result = validateFiscalData({
      ...validBase,
      subtotal: 900,
      itbis_amount: 162,
      legal_tip_amount: 90,
      other_taxes: 10,
      total_amount: 1162,
      line_items: [{ description: 'SERVICIO', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 1000, discount: 100 }]
    });
    expect(result.is_valid).toBe(true);
    expect(result.math_valid).toBe(true);
  });
});
