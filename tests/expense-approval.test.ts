import { describe, expect, it } from 'vitest';
import { validateExpenseForApproval, type ExpenseApprovalCandidate } from '../server/services/expense-approval.service.ts';

const session = { id: 'session-1', status: 'PROCESSED', supplier_id: 'supplier-1' } as const;
const activeSupplier = { id: 'supplier-1', status_dgii: 'ACTIVO' as const, rnc_normalized: '101001577' };

function candidate(overrides: Partial<ExpenseApprovalCandidate> = {}): ExpenseApprovalCandidate {
  return {
    supplier_id: 'supplier-1',
    receipt_session_id: session.id,
    supplier_rnc: '101001577',
    ncf: 'B0100000001',
    ncf_type: 'B01',
    subtotal: 1000,
    itbis_amount: 180,
    legal_tip_amount: 0,
    other_taxes: 0,
    total_amount: 1180,
    ...overrides
  };
}

describe('server-side expense approval validation', () => {
  it('allows a valid final payload from an active supplier', () => {
    const result = validateExpenseForApproval(candidate(), session, activeSupplier);
    expect(result.valid).toBe(true);
    expect(result.code).toBe('OK');
  });

  it.each(['SUSPENDIDO', 'INACTIVO', 'DADO_DE_BAJA', 'NO_LOCALIZADO', 'DESCONOCIDO'] as const)(
    'blocks supplier status %s from approval',
    status => {
      const result = validateExpenseForApproval(candidate(), session, { ...activeSupplier, status_dgii: status });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('EXPENSE_SUPPLIER_NOT_ACTIVE');
    }
  );

  it('rejects a final total edited after OCR processing', () => {
    const result = validateExpenseForApproval(candidate({ total_amount: 1500 }), session, activeSupplier);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('EXPENSE_FISCAL_REVALIDATION_REQUIRED');
  });

  it('rejects edited line arithmetic even when the header total looks plausible', () => {
    const result = validateExpenseForApproval(candidate({
      subtotal: 900,
      line_items: [{ description: 'BIEN EDITADO', quantity: 1, unit_price: 1000, itbis_rate: 18, total: 900 }]
    }), session, activeSupplier);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('EXPENSE_FISCAL_REVALIDATION_REQUIRED');
  });

  it('requires a structurally valid NCF before approval', () => {
    const result = validateExpenseForApproval(candidate({ ncf: 'B9900000001' }), session, activeSupplier);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('EXPENSE_FISCAL_REVALIDATION_REQUIRED');
  });

  it('fails closed for an unprocessed session', () => {
    const result = validateExpenseForApproval(candidate(), { ...session, status: 'REVIEW_REQUIRED' }, activeSupplier);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('EXPENSE_RECEIPT_REVIEW_REQUIRED');
  });
});
