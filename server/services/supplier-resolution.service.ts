import type { Supplier, SupplierResolution } from '../../src/types.ts';
import { validateDominicanRnc } from '../../src/utils/fiscalValidators.ts';
import { prismaRepo } from '../database/prisma.repository.ts';
import { DgiiProviderService, dgiiProvider, type DgiiTaxpayerData } from './dgii-provider.service.ts';

export interface SupplierResolutionRepository {
  findSupplierByNormalizedRnc(orgId: string, normalizedRnc: string): Promise<Supplier | null>;
  createVerifiedSupplier(orgId: string, taxpayer: DgiiTaxpayerData): Promise<{ supplier: Supplier; created: boolean }>;
}

function normalizeName(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export class SupplierResolutionService {
  constructor(
    private readonly repository: SupplierResolutionRepository = prismaRepo,
    private readonly dgii: DgiiProviderService = dgiiProvider
  ) {}

  async resolve(orgId: string, rawRnc: string, supplierName: string): Promise<SupplierResolution> {
    let normalizedRnc = (rawRnc || '').replace(/\D/g, '');

    if (normalizedRnc) {
      const validation = validateDominicanRnc(normalizedRnc);
      if (!validation.isValid) {
        return { status: 'INVALID_RNC', message: validation.message || 'RNC o cédula inválido.' };
      }
      normalizedRnc = validation.clean;
    } else if (normalizeName(supplierName).length >= 4) {
      const byName = await this.dgii.lookupExactName(supplierName);
      if (byName.outcome === 'FOUND') {
        const requestedName = normalizeName(supplierName);
        const officialNames = [normalizeName(byName.data.name), normalizeName(byName.data.trade_name || '')];
        if (officialNames.includes(requestedName)) normalizedRnc = byName.data.rnc;
      }
      if (!normalizedRnc) {
        return { status: 'PENDING_VALIDATION', message: 'No se encontró una coincidencia fiscal exacta para crear el proveedor automáticamente.' };
      }
    } else {
      return { status: 'PENDING_VALIDATION', message: 'El OCR no detectó un RNC ni un nombre suficientemente claro.' };
    }

    const existing = await this.repository.findSupplierByNormalizedRnc(orgId, normalizedRnc);
    if (existing) {
      return { status: 'EXISTING', supplier: existing, dgii_status: existing.status_dgii, message: 'Proveedor existente reutilizado.' };
    }

    const lookup = await this.dgii.lookupByRnc(normalizedRnc);
    if (lookup.outcome === 'NOT_FOUND') return { status: 'NOT_FOUND', message: lookup.message };
    if (lookup.outcome !== 'FOUND') {
      return { status: 'PENDING_VALIDATION', message: lookup.message };
    }

    // Required race-condition check immediately before inserting.
    const racedExisting = await this.repository.findSupplierByNormalizedRnc(orgId, normalizedRnc);
    if (racedExisting) {
      return { status: 'EXISTING', supplier: racedExisting, dgii_status: racedExisting.status_dgii, message: 'Proveedor existente reutilizado.' };
    }

    const saved = await this.repository.createVerifiedSupplier(orgId, lookup.data);
    return {
      status: saved.created ? 'CREATED' : 'EXISTING',
      supplier: saved.supplier,
      dgii_status: saved.supplier.status_dgii,
      message: saved.created ? 'Proveedor creado automáticamente con datos fiscales verificados.' : 'Proveedor creado por otra solicitud y reutilizado.'
    };
  }
}

export const supplierResolutionService = new SupplierResolutionService();
