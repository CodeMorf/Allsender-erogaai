import { ExpenseClassification, ExpenseStatus, NcfType } from '../types.js';

export function formatCurrency(amount: number, currency: 'DOP' | 'USD' | 'EUR' = 'DOP'): string {
  const symbol = currency === 'DOP' ? 'RD$' : currency === 'USD' ? 'US$' : '€';
  return `${symbol} ${Number(amount || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

// DGII RNC validation algorithm (9 digits Modulo 11 or 11 digits Cédula Modulo 10)
export function validateRNC(rnc: string): { isValid: boolean; type: 'RNC' | 'CEDULA' | 'INVALID'; message: string } {
  const clean = rnc.replace(/[^0-9]/g, '');
  if (clean.length === 9) {
    // RNC 9 digits
    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(clean[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    let checkDigit = 0;
    if (remainder === 0) checkDigit = 2;
    else if (remainder === 1) checkDigit = 1;
    else checkDigit = 11 - remainder;

    const isValid = parseInt(clean[8], 10) === checkDigit;
    return {
      isValid,
      type: 'RNC',
      message: isValid ? 'RNC de Persona Jurídica válido (DGII)' : 'RNC con dígito verificador incorrecto'
    };
  } else if (clean.length === 11) {
    // Cédula 11 digits
    let sum = 0;
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    for (let i = 0; i < 10; i++) {
      let product = parseInt(clean[i], 10) * weights[i];
      if (product >= 10) {
        product = Math.floor(product / 10) + (product % 10);
      }
      sum += product;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const isValid = parseInt(clean[10], 10) === checkDigit;
    return {
      isValid,
      type: 'CEDULA',
      message: isValid ? 'Cédula de Persona Física válida (DGII)' : 'Cédula con dígito verificador incorrecto'
    };
  }
  return {
    isValid: false,
    type: 'INVALID',
    message: 'Longitud inválida (debe ser 9 dígitos para RNC o 11 para Cédula)'
  };
}

// NCF structure validator
export function validateNCF(ncf: string): { isValid: boolean; ncfType: NcfType | 'UNKNOWN'; message: string } {
  const clean = ncf.trim().toUpperCase();
  // Standard NCF: B + 2 digits type + 8 sequence digits (total 11 chars)
  // Electronic e-NCF: E + 2 digits type + 10 sequence digits (total 13 chars)
  const bRegex = /^B(01|02|14|15|16)[0-9]{8}$/;
  const eRegex = /^E(31|32|44|45)[0-9]{10}$/;

  if (bRegex.test(clean)) {
    const type = clean.substring(0, 3) as NcfType;
    const desc = type === 'B01' ? 'Crédito Fiscal' : type === 'B02' ? 'Consumo' : type === 'B14' ? 'Regímenes Especiales' : 'Gubernamental';
    return {
      isValid: true,
      ncfType: type,
      message: `NCF Tradicional Válido: ${desc}`
    };
  }

  if (eRegex.test(clean)) {
    const type = clean.substring(0, 3) as NcfType;
    const desc = type === 'E31' ? 'e-NCF Factura Crédito Fiscal' : type === 'E32' ? 'e-NCF Consumo' : 'e-NCF Especial';
    return {
      isValid: true,
      ncfType: type,
      message: `Comprobante Fiscal Electrónico: ${desc}`
    };
  }

  return {
    isValid: false,
    ncfType: 'UNKNOWN',
    message: 'Estructura de NCF no cumple con formato DGII (ej: B0100000001 o E310000000001)'
  };
}

export function getStatusDetails(status: ExpenseStatus) {
  switch (status) {
    case 'APROBADO':
      return {
        label: 'Aprobado',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      };
    case 'SINCRONIZADO_ERP':
      return {
        label: 'Sincronizado AllSender',
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-300 dark:border-emerald-700',
        dot: 'bg-emerald-600'
      };
    case 'PENDIENTE_REVISION':
      return {
        label: 'Pendiente de Revisión',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    case 'BORRADOR':
      return {
        label: 'Borrador',
        bg: 'bg-slate-100 dark:bg-slate-800/60',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400'
      };
    case 'RECHAZADO':
      return {
        label: 'Rechazado',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500'
      };
  }
}

export function getClassificationDetails(classification: ExpenseClassification) {
  switch (classification) {
    case 'GASTO_OPERATIVO':
      return {
        label: 'Gasto Operativo',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
        desc: 'Gastos administrativos, ventas y mantenimiento de rutina'
      };
    case 'COSTO_VENTA':
      return {
        label: 'Costo de Venta',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
        desc: 'Costos directamente asociados a la prestación de servicios o venta'
      };
    case 'COMPRA_INVENTARIO':
      return {
        label: 'Compra para Inventario',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        desc: 'Mercancías y materias primas destinadas a stock o reventa'
      };
    case 'ACTIVO_FIJO':
      return {
        label: 'Activo Fijo',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
        desc: 'Bienes de capital, maquinaria, mobiliario o equipos con depreciación'
      };
  }
}
