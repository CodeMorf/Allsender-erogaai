import type { NcfType, ReceiptExtraction, ValidationResult } from '../../src/types.ts';
import { validateDominicanNcf, validateDominicanRnc } from '../../src/utils/fiscalValidators.ts';
import { reconcileReceiptMath } from './receipt-consolidator.service.ts';

export interface FiscalValidationInput {
  supplier_name?: string | null;
  supplier_rnc?: string | null;
  ncf?: string | null;
  ncf_type?: NcfType | string | null;
  subtotal?: number | null;
  itbis_amount?: number | null;
  legal_tip_amount?: number | null;
  other_taxes?: number | null;
  total_amount?: number | null;
  line_items?: ReceiptExtraction['line_items'];
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toFiscalExtraction(input: FiscalValidationInput): ReceiptExtraction {
  return {
    supplier_name: '',
    supplier_rnc: String(input.supplier_rnc || ''),
    ncf: String(input.ncf || ''),
    ncf_type: (input.ncf_type || 'B01') as NcfType,
    date: '',
    subtotal: numberOrZero(input.subtotal),
    itbis_amount: numberOrZero(input.itbis_amount),
    legal_tip_amount: numberOrZero(input.legal_tip_amount),
    other_taxes: numberOrZero(input.other_taxes),
    total_amount: numberOrZero(input.total_amount),
    currency: 'DOP',
    document_type: 'RECIBO',
    suggested_classification: 'GASTO_OPERATIVO',
    suggested_category: '',
    confidence_score: 100,
    line_items: input.line_items || []
  };
}

/**
 * Single fiscal validation contract used by OCR, review and approval.
 * Invalid identifiers and mathematical inconsistencies are hard failures.
 */
export function validateFiscalData(input: FiscalValidationInput): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const extraction = toFiscalExtraction(input);

  const cleanRnc = extraction.supplier_rnc.replace(/[^0-9]/g, '');
  const rncValidation = cleanRnc ? validateDominicanRnc(cleanRnc) : null;
  const rncValid = Boolean(rncValidation?.isValid);
  if (!rncValid) {
    errors.push(rncValidation
      ? `RNC o cédula inválido (${cleanRnc}): ${rncValidation.message || 'dígito verificador incorrecto'}.`
      : 'El RNC o cédula del proveedor es requerido para aprobar.');
  }

  const ncfValidation = validateDominicanNcf(extraction.ncf);
  let ncfValid = ncfValidation.isValid;
  if (!ncfValid) {
    errors.push(ncfValidation.message);
  } else if (input.ncf_type && input.ncf_type !== ncfValidation.ncfType) {
    ncfValid = false;
    errors.push(`El tipo NCF declarado (${input.ncf_type}) no coincide con el prefijo ${ncfValidation.ncfType}.`);
  }

  const reconciliation = reconcileReceiptMath(extraction);
  const mathValid = reconciliation.is_valid;
  if (!mathValid) {
    // The printed ITBIS may be partial, included in the total, or read with
    // low confidence. Keep the receipt in review without presenting the
    // difference as a definitive fiscal error. Approval remains blocked by
    // the reconciliation gate in the approval service.
    warnings.push(
      `Montos por revisar: el total indicado es RD$ ${reconciliation.expected_total.toFixed(2)} `
      + `y la suma revisada es RD$ ${reconciliation.calculated_total.toFixed(2)} `
      + `(diferencia RD$ ${Math.abs(reconciliation.difference).toFixed(2)}).`
    );
  }
  if (extraction.line_items.length === 0) {
    warnings.push('El comprobante no tiene líneas de detalle; confirme el subtotal y los impuestos.');
  }

  return {
    is_valid: rncValid && ncfValid && mathValid,
    rnc_valid: rncValid,
    ncf_valid: ncfValid,
    math_valid: mathValid,
    warnings,
    errors
  };
}
