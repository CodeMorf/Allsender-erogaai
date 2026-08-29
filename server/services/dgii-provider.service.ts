import type { Supplier } from '../../src/types.ts';

export interface DgiiTaxpayerData {
  rnc: string;
  name: string;
  trade_name?: string;
  status: Supplier['status_dgii'];
  categoria?: string;
  regimen_de_pagos?: string;
  actividad_economica?: string;
  administracion_local?: string;
  facturador_electronico?: string;
  licencias_vhm?: string;
  source: 'MEGAPLUS_DGII';
  raw: Record<string, unknown>;
}

export type DgiiLookupResult =
  | { outcome: 'FOUND'; data: DgiiTaxpayerData }
  | { outcome: 'NOT_FOUND' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'TIMEOUT'; message: string; status_code?: number };

type FetchLike = typeof fetch;

export function normalizeDgiiStatus(raw: unknown): Supplier['status_dgii'] {
  const status = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (status === 'ACTIVO') return 'ACTIVO';
  if (status === 'SUSPENDIDO') return 'INACTIVO';
  if (status === 'DADO_DE_BAJA' || status === 'DADO_BAJA') return 'DADO_DE_BAJA';
  if (status === 'INACTIVO') return 'INACTIVO';
  if (status === 'NO_LOCALIZADO') return 'NO_LOCALIZADO';
  return 'DESCONOCIDO';
}

export class DgiiProviderService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: FetchLike;

  constructor(options: { baseUrl?: string; timeoutMs?: number; fetcher?: FetchLike } = {}) {
    this.baseUrl = (options.baseUrl || process.env.DGII_PROVIDER_BASE_URL || 'https://rnc.megaplus.com.do').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || Number(process.env.DGII_PROVIDER_TIMEOUT_MS || 7000);
    this.fetcher = options.fetcher || fetch;
  }

  async lookupByRnc(rnc: string): Promise<DgiiLookupResult> {
    const normalized = (rnc || '').replace(/\D/g, '');
    if (![9, 11].includes(normalized.length)) {
      return { outcome: 'INVALID_REQUEST', message: 'El RNC o la cédula debe contener 9 u 11 dígitos.' };
    }
    return this.request(`/api/consulta?rnc=${encodeURIComponent(normalized)}`);
  }

  async lookupExactName(name: string): Promise<DgiiLookupResult> {
    const search = (name || '').trim().replace(/\s+/g, ' ');
    if (search.length < 3) return { outcome: 'INVALID_REQUEST', message: 'El nombre es demasiado corto para consultar.' };
    return this.request(`/api/consulta/nombre?buscar=${encodeURIComponent(search)}`);
  }

  async searchNames(name: string): Promise<DgiiTaxpayerData[]> {
    const search = (name || '').trim().replace(/\s+/g, ' ');
    if (search.length < 3) return [];
    const result = await this.requestRaw(`/api/consulta/nombres?buscar=${encodeURIComponent(search)}`);
    if (!result.ok || !Array.isArray(result.body?.resultados)) return [];
    return result.body.resultados.map((entry: Record<string, unknown>) => this.mapTaxpayer(entry)).filter((entry: DgiiTaxpayerData) => Boolean(entry.rnc));
  }

  private async request(path: string): Promise<DgiiLookupResult> {
    const result = await this.requestRaw(path);
    if (!result.ok) {
      if (result.timeout) return { outcome: 'TIMEOUT', message: 'La consulta fiscal excedió el tiempo máximo.' };
      if (result.status === 404) return { outcome: 'NOT_FOUND', message: result.message || 'Contribuyente no encontrado.', status_code: 404 };
      if (result.status === 400) return { outcome: 'INVALID_REQUEST', message: result.message || 'Consulta fiscal inválida.', status_code: 400 };
      if (result.status === 429) return { outcome: 'RATE_LIMITED', message: result.message || 'Límite temporal de consultas fiscales alcanzado.', status_code: 429 };
      return { outcome: 'UNAVAILABLE', message: result.message || 'El proveedor de consulta fiscal no está disponible.', status_code: result.status };
    }
    const data = this.mapTaxpayer(result.body || {});
    if (!data.rnc || !data.name) return { outcome: 'UNAVAILABLE', message: 'La consulta fiscal devolvió una respuesta incompleta.' };
    return { outcome: 'FOUND', data };
  }

  private async requestRaw(path: string): Promise<{ ok: boolean; status?: number; body?: any; message?: string; timeout?: boolean }> {
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
      const body = await response.json().catch(() => null);
      return { ok: response.ok && body?.error !== true, status: response.status, body, message: body?.mensaje };
    } catch (error: any) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      return { ok: false, timeout, message: timeout ? 'Tiempo de espera agotado.' : 'Error de red al consultar el proveedor fiscal.' };
    }
  }

  private mapTaxpayer(body: Record<string, any>): DgiiTaxpayerData {
    return {
      rnc: String(body.rnc_consultado || body.cedula_rnc || '').replace(/\D/g, ''),
      name: String(body.nombre_razon_social || '').trim(),
      trade_name: String(body.nombre_comercial || '').trim() || undefined,
      status: normalizeDgiiStatus(body.estado),
      categoria: String(body.categoria || '').trim() || undefined,
      regimen_de_pagos: String(body.regimen_de_pagos || '').trim() || undefined,
      actividad_economica: String(body.actividad_economica || '').trim() || undefined,
      administracion_local: String(body.administracion_local || '').trim() || undefined,
      facturador_electronico: String(body.facturador_electronico || '').trim() || undefined,
      licencias_vhm: String(body.licencias_de_comercializacion_de_vhm || '').trim() || undefined,
      source: 'MEGAPLUS_DGII',
      raw: body
    };
  }
}

export const dgiiProvider = new DgiiProviderService();
