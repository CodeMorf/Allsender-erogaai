/**
 * Preserva la tasa ITBIS extraída. Cero es un valor fiscal válido (exento).
 * Solo valores ausentes o no numéricos usan el fallback explícito.
 */
export function normalizeItbisRate(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
