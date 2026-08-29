import type { ReceiptExtraction, ReceiptMathReconciliation, Supplier, ValidationResult } from '../../src/types.ts';
import { validateFiscalData, toFiscalExtraction, type FiscalValidationInput } from './fiscal-validation.service.ts';
import { reconcileReceiptMath } from './receipt-consolidator.service.ts';

export interface ExpenseApprovalCandidate extends FiscalValidationInput {
  supplier_id?: string | null;
  receipt_session_id?: string | null;
}

export interface ApprovalSessionContext {
  id: string;
  status: string;
  supplier_id?: string | null;
}

export interface ApprovalSupplierContext {
  id: string;
  status_dgii: Supplier['status_dgii'];
  rnc_normalized?: string | null;
}

export interface ExpenseApprovalEvaluation {
  valid: boolean;
  code: string;
  message: string;
  fiscalValidation: ValidationResult;
  reconciliation: ReceiptMathReconciliation;
  extraction: ReceiptExtraction;
}

function normalizedRnc(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

function failure(
  code: string,
  message: string,
  fiscalValidation: ValidationResult,
  reconciliation: ReceiptMathReconciliation,
  extraction: ReceiptExtraction
): ExpenseApprovalEvaluation {
  return { valid: false, code, message, fiscalValidation, reconciliation, extraction };
}

/**
 * Revalidates the exact values about to be persisted as APROBADO.
 * This function is deliberately repository-free so every HTTP/API path can
 * share the same fail-closed approval rules.
 */
export function validateExpenseForApproval(
  candidate: ExpenseApprovalCandidate,
  session: ApprovalSessionContext | null,
  supplier: ApprovalSupplierContext | null
): ExpenseApprovalEvaluation {
  const extraction = toFiscalExtraction(candidate);
  const fiscalValidation = validateFiscalData(candidate);
  const reconciliation = reconcileReceiptMath(extraction);

  if (!session) {
    return failure(
      'EXPENSE_RECEIPT_SESSION_REQUIRED',
      'La aprobación requiere una sesión de comprobante procesada.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (session.status !== 'PROCESSED') {
    return failure(
      'EXPENSE_RECEIPT_REVIEW_REQUIRED',
      'El comprobante requiere revisión antes de ser aprobado.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (!supplier || !candidate.supplier_id) {
    return failure(
      'EXPENSE_SUPPLIER_REQUIRED',
      'La aprobación requiere un proveedor validado.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (session.supplier_id && session.supplier_id !== candidate.supplier_id) {
    return failure(
      'EXPENSE_SUPPLIER_SESSION_MISMATCH',
      'El proveedor no coincide con el proveedor validado en la sesión.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (supplier.id !== candidate.supplier_id) {
    return failure(
      'EXPENSE_SUPPLIER_SCOPE_INVALID',
      'El proveedor no pertenece al contexto validado de la erogación.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (supplier.status_dgii !== 'ACTIVO') {
    return failure(
      'EXPENSE_SUPPLIER_NOT_ACTIVE',
      `El proveedor tiene estado DGII ${supplier.status_dgii}; solo ACTIVO puede aprobarse automáticamente.`,
      fiscalValidation,
      reconciliation,
      extraction
    );
  }

  const supplierRnc = normalizedRnc(supplier.rnc_normalized);
  const candidateRnc = normalizedRnc(candidate.supplier_rnc);
  if (supplierRnc && candidateRnc && supplierRnc !== candidateRnc) {
    return failure(
      'EXPENSE_SUPPLIER_RNC_MISMATCH',
      'El RNC del comprobante no coincide con el RNC del proveedor validado.',
      fiscalValidation,
      reconciliation,
      extraction
    );
  }
  if (!fiscalValidation.is_valid || !reconciliation.is_valid) {
    const reasons = fiscalValidation.errors.length > 0 ? ` ${fiscalValidation.errors.join(' ')}` : '';
    return failure(
      'EXPENSE_FISCAL_REVALIDATION_REQUIRED',
      `Los datos finales del comprobante requieren revalidación antes de aprobarse.${reasons}`,
      fiscalValidation,
      reconciliation,
      extraction
    );
  }

  return {
    valid: true,
    code: 'OK',
    message: 'Los datos fiscales finales fueron revalidados correctamente.',
    fiscalValidation,
    reconciliation,
    extraction
  };
}
