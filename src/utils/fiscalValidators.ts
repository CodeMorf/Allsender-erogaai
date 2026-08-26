/**
 * Utilidades fiscales oficiales para República Dominicana (DGII)
 * Validación algorítmica de RNC (9 dígitos) y Cédula de Identidad y Electoral (11 dígitos)
 */

export interface RncValidationResult {
  isValid: boolean;
  type: 'RNC' | 'CEDULA' | 'INVALID';
  formatted: string;
  clean: string;
  message?: string;
}

/**
 * Limpia y normaliza un RNC o Cédula eliminando guiones y espacios
 */
export function cleanRnc(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

/**
 * Formatea un RNC o Cédula al estándar visual oficial
 * RNC (9 dígitos): 101-02394-1
 * Cédula (11 dígitos): 001-0123456-7
 */
export function formatRnc(raw: string): string {
  const clean = cleanRnc(raw);
  if (clean.length === 9) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 8)}-${clean.substring(8, 9)}`;
  }
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 10)}-${clean.substring(10, 11)}`;
  }
  return raw;
}

/**
 * Valida un RNC de 9 dígitos según el algoritmo oficial Módulo 11 de la DGII
 */
export function validateRnc9(clean: string): boolean {
  if (clean.length !== 9 || !/^\d{9}$/.test(clean)) {
    return false;
  }

  // RNCs válidos comienzan comúnmente con 1, 4 o 5
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights[i];
  }

  const remainder = sum % 11;
  let verifier = 0;

  if (remainder === 0) {
    verifier = 2;
  } else if (remainder === 1) {
    verifier = 1;
  } else {
    verifier = 11 - remainder;
  }

  return verifier === parseInt(clean.charAt(8), 10);
}

/**
 * Valida una Cédula de 11 dígitos según el algoritmo oficial Módulo 10 de la JCE / DGII
 */
export function validateCedula11(clean: string): boolean {
  if (clean.length !== 11 || !/^\d{11}$/.test(clean)) {
    return false;
  }

  // Comprueba que no sea todo ceros
  if (/^0{11}$/.test(clean)) return false;

  let sum = 0;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];

  for (let i = 0; i < 10; i++) {
    let mul = parseInt(clean.charAt(i), 10) * weights[i];
    if (mul >= 10) {
      mul = Math.floor(mul / 10) + (mul % 10);
    }
    sum += mul;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean.charAt(10), 10);
}

/**
 * Validador universal de identificación tributaria Dominicana (RNC o Cédula)
 */
export function validateDominicanRnc(raw: string): RncValidationResult {
  const clean = cleanRnc(raw);

  if (!clean) {
    return {
      isValid: false,
      type: 'INVALID',
      formatted: raw,
      clean: '',
      message: 'El RNC o Cédula es requerido'
    };
  }

  if (clean.length === 9) {
    const isValid = validateRnc9(clean);
    return {
      isValid,
      type: 'RNC',
      formatted: formatRnc(clean),
      clean,
      message: isValid ? undefined : 'Dígito verificador inválido para RNC de 9 dígitos (DGII)'
    };
  }

  if (clean.length === 11) {
    const isValid = validateCedula11(clean);
    return {
      isValid,
      type: 'CEDULA',
      formatted: formatRnc(clean),
      clean,
      message: isValid ? undefined : 'Dígito verificador inválido para Cédula de 11 dígitos (JCE/DGII)'
    };
  }

  return {
    isValid: false,
    type: 'INVALID',
    formatted: raw,
    clean,
    message: `Longitud incorrecta (${clean.length} dígitos). Debe tener 9 (RNC) u 11 (Cédula).`
  };
}

/**
 * Máscara visual de API Key para mostrar en interfaces seguras
 * e.g. eroga_live_••••••••••••8K92
 */
export function maskErogaApiKey(keyOrHash: string): string {
  if (!keyOrHash) return 'eroga_live_••••••••••••0000';
  const clean = keyOrHash.replace(/[^a-zA-Z0-9]/g, '');
  const last4 = clean.slice(-4) || '8K92';
  return `eroga_live_••••••••••••${last4.toUpperCase()}`;
}
