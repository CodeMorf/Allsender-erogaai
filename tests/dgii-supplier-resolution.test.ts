import { describe, expect, it } from 'vitest';
import type { Supplier } from '../src/types.ts';
import { validateDominicanRnc } from '../src/utils/fiscalValidators.ts';
import { DgiiProviderService, normalizeDgiiStatus, type DgiiTaxpayerData } from '../server/services/dgii-provider.service.ts';
import { SupplierResolutionService, type SupplierResolutionRepository } from '../server/services/supplier-resolution.service.ts';

const VALID_RNC = '101001577';

function response(status = 200, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function taxpayerBody(overrides: Record<string, unknown> = {}) {
  return {
    cedula_rnc: VALID_RNC,
    rnc_consultado: VALID_RNC,
    nombre_razon_social: 'PROVEEDOR OFICIAL SRL',
    nombre_comercial: 'PROVEEDOR OFICIAL',
    estado: 'ACTIVO',
    categoria: 'Persona Jurídica',
    regimen_de_pagos: 'NORMAL',
    actividad_economica: 'COMERCIO',
    administracion_local: 'SANTO DOMINGO',
    facturador_electronico: 'SI',
    licencias_de_comercializacion_de_vhm: 'NO',
    ...overrides
  };
}

function supplier(orgId: string, rnc = VALID_RNC): Supplier {
  return {
    id: `supplier_${orgId}`,
    organization_id: orgId,
    rnc,
    rnc_normalized: rnc,
    name: 'PROVEEDOR OFICIAL SRL',
    status_dgii: 'ACTIVO',
    total_invoiced: 0,
    created_at: new Date(0).toISOString()
  };
}

class MemorySupplierRepository implements SupplierResolutionRepository {
  readonly suppliers = new Map<string, Supplier>();
  createCalls = 0;

  async findSupplierByNormalizedRnc(orgId: string, normalizedRnc: string) {
    return this.suppliers.get(`${orgId}:${normalizedRnc}`) || null;
  }

  async createVerifiedSupplier(orgId: string, taxpayer: DgiiTaxpayerData) {
    await Promise.resolve();
    const key = `${orgId}:${taxpayer.rnc}`;
    const existing = this.suppliers.get(key);
    if (existing) return { supplier: existing, created: false };
    this.createCalls += 1;
    const created: Supplier = {
      ...supplier(orgId, taxpayer.rnc),
      id: `supplier_${orgId}_${this.createCalls}`,
      name: taxpayer.name,
      trade_name: taxpayer.trade_name,
      status_dgii: taxpayer.status,
      dgii_source: taxpayer.source
    };
    this.suppliers.set(key, created);
    return { supplier: created, created: true };
  }
}

function providerWith(fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return new DgiiProviderService({ fetcher: fetcher as typeof fetch, timeoutMs: 50 });
}

describe('Dominican fiscal identifier validation', () => {
  it('accepts valid 9-digit RNC and 11-digit cédula values', () => {
    expect(validateDominicanRnc(VALID_RNC)).toMatchObject({ isValid: true, type: 'RNC', clean: VALID_RNC });
    expect(validateDominicanRnc('00113918205')).toMatchObject({ isValid: true, type: 'CEDULA', clean: '00113918205' });
  });

  it('normalizes OCR hyphens/spaces and rejects an invalid verifier', () => {
    expect(validateDominicanRnc('001-1391820-5').clean).toBe('00113918205');
    expect(validateDominicanRnc('001 1391820 5').isValid).toBe(true);
    expect(validateDominicanRnc('101001578').isValid).toBe(false);
  });
});

describe('MegaPlus-backed supplier resolution', () => {
  it('maps SUSPENDIDO to the only requested inactive company state', () => {
    expect(normalizeDgiiStatus('SUSPENDIDO')).toBe('INACTIVO');
    expect(normalizeDgiiStatus('DADO DE BAJA')).toBe('DADO_DE_BAJA');
    expect(normalizeDgiiStatus('NO LOCALIZADO')).toBe('NO_LOCALIZADO');
  });

  it('handles HTTP 400, 429 and network errors with explicit outcomes', async () => {
    const invalid = await providerWith(async () => response(400, { mensaje: 'Solicitud inválida' })).lookupByRnc(VALID_RNC);
    const rateLimited = await providerWith(async () => response(429, { mensaje: 'Demasiadas consultas' })).lookupByRnc(VALID_RNC);
    const network = await providerWith(async () => { throw new Error('network down'); }).lookupByRnc(VALID_RNC);
    expect(invalid.outcome).toBe('INVALID_REQUEST');
    expect(rateLimited.outcome).toBe('RATE_LIMITED');
    expect(network.outcome).toBe('UNAVAILABLE');
  });

  it('returns partial-name results only as suggestions', async () => {
    const provider = providerWith(async () => response(200, { resultados: [taxpayerBody()] }));
    const suggestions = await provider.searchNames('PROVEEDOR');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ rnc: VALID_RNC, name: 'PROVEEDOR OFICIAL SRL' });
  });

  it('reuses a local tenant supplier without calling MegaPlus', async () => {
    const repository = new MemorySupplierRepository();
    repository.suppliers.set(`tenant-a:${VALID_RNC}`, supplier('tenant-a'));
    let requests = 0;
    const service = new SupplierResolutionService(repository, providerWith(async () => {
      requests += 1;
      return response(500);
    }));
    const result = await service.resolve('tenant-a', VALID_RNC, 'PROVEEDOR');
    expect(result.status).toBe('EXISTING');
    expect(result.supplier?.organization_id).toBe('tenant-a');
    expect(requests).toBe(0);
  });

  it('creates a verified supplier on HTTP 200 and preserves official fields', async () => {
    const repository = new MemorySupplierRepository();
    const service = new SupplierResolutionService(repository, providerWith(async () => response(200, taxpayerBody())));
    const result = await service.resolve('tenant-a', '101-00157-7', 'PROVEEDOR OFICIAL SRL');
    expect(result.status).toBe('CREATED');
    expect(result.supplier).toMatchObject({ organization_id: 'tenant-a', rnc_normalized: VALID_RNC, name: 'PROVEEDOR OFICIAL SRL', status_dgii: 'ACTIVO' });
    expect(repository.createCalls).toBe(1);
  });

  it('allows the same RNC in different tenants but never duplicates it inside one tenant', async () => {
    const repository = new MemorySupplierRepository();
    const service = new SupplierResolutionService(repository, providerWith(async () => response(200, taxpayerBody())));
    const [first, second] = await Promise.all([
      service.resolve('tenant-a', VALID_RNC, 'PROVEEDOR OFICIAL SRL'),
      service.resolve('tenant-a', VALID_RNC, 'PROVEEDOR OFICIAL SRL')
    ]);
    const tenantB = await service.resolve('tenant-b', VALID_RNC, 'PROVEEDOR OFICIAL SRL');
    expect([first.status, second.status].sort()).toEqual(['CREATED', 'EXISTING']);
    expect(tenantB.status).toBe('CREATED');
    expect(repository.createCalls).toBe(2);
    expect(repository.suppliers.size).toBe(2);
  });

  it('does not create suppliers for HTTP 404, HTTP 500 or timeout', async () => {
    const scenarios = [
      { expected: 'NOT_FOUND', fetcher: async () => response(404, { mensaje: 'No encontrado' }) },
      { expected: 'PENDING_VALIDATION', fetcher: async () => response(500, { mensaje: 'Error temporal' }) },
      { expected: 'PENDING_VALIDATION', fetcher: async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); } }
    ];
    for (const scenario of scenarios) {
      const repository = new MemorySupplierRepository();
      const service = new SupplierResolutionService(repository, providerWith(scenario.fetcher));
      const result = await service.resolve('tenant-a', VALID_RNC, 'PROVEEDOR OFICIAL SRL');
      expect(result.status).toBe(scenario.expected);
      expect(repository.createCalls).toBe(0);
    }
  });

  it('uses exact-name lookup only when no RNC exists and never auto-creates from a failed exact match', async () => {
    const repository = new MemorySupplierRepository();
    const service = new SupplierResolutionService(repository, providerWith(async input => {
      const url = String(input);
      if (url.includes('/nombre?')) return response(200, taxpayerBody());
      return response(200, taxpayerBody());
    }));
    const created = await service.resolve('tenant-a', '', 'PROVEEDOR OFICIAL SRL');
    expect(created.status).toBe('CREATED');

    const noMatchService = new SupplierResolutionService(new MemorySupplierRepository(), providerWith(async () => response(404)));
    const pending = await noMatchService.resolve('tenant-a', '', 'NOMBRE PARCIAL');
    expect(pending.status).toBe('PENDING_VALIDATION');
  });
});
