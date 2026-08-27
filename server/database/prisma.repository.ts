import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  Organization,
  Company,
  Branch,
  User,
  ExpenseRecord,
  LineItem,
  AuditLog,
  ApiKey,
  ApiKeyLog,
  ApiKeyScope,
  PermissionDefinition,
  RoleDefinition,
  ExpenseCategory,
  CostCenter,
  Supplier,
  Project,
  Vehicle,
  ReceiptRecord,
  AIProviderConfig,
  AIUsageLog,
  ERPConfig,
  WebhookSubscription
} from '../../src/types.ts';
import { decryptApiKey, encryptApiKey, generateRawApiKey, hashApiKey, maskApiKey } from '../encryption.ts';
import { PERMISSIONS, defaultRolesForOrg } from '../rbac.ts';

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'PERSISTENCE_ERROR'
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

type OrganizationRow = any;
type UserRow = any;
type CompanyRow = any;
type BranchRow = any;
type ExpenseRow = any;

const nowDate = () => new Date();
const iso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : undefined;
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const id = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};
const normalizedScopes = (scopes: string[]) => scopes.map(scope => ({
  'read:expenses': 'expenses:read',
  'write:expenses': 'expenses:write',
  'extract:receipts': 'ocr:process'
}[scope] || scope));

const DEFAULT_CATEGORIES: Array<Partial<ExpenseCategory>> = [
  { name: 'Combustible y Movilidad de Campo', code: 'CAT-COMB-01', account_code: '6105-01', dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios', default_itbis_rate: 0, icon: 'Fuel', color: '#3B82F6' },
  { name: 'Dietas, Almuerzos y Representación', code: 'CAT-DIET-02', account_code: '6108-02', dgii_type_code: '05 - Gastos de Representación', default_itbis_rate: 18, icon: 'UtensilsCrossed', color: '#10B981' },
  { name: 'Suministros de Oficina y Papelería', code: 'CAT-OFIC-03', account_code: '6104-01', dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios', default_itbis_rate: 18, icon: 'Paperclip', color: '#8B5CF6' },
  { name: 'Mantenimiento y Reparaciones', code: 'CAT-MANT-04', account_code: '6106-03', dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios', default_itbis_rate: 18, icon: 'Wrench', color: '#EC4899' },
  { name: 'Equipos de Cómputo y Tecnología', code: 'CAT-TEC-05', account_code: '1205-01', dgii_type_code: '10 - Adquisición de Activos', default_classification: 'ACTIVO_FIJO', default_itbis_rate: 18, icon: 'Laptop', color: '#6366F1' },
  { name: 'Repuestos e Inventario para Reventa', code: 'CAT-INV-06', account_code: '5101-01', dgii_type_code: '09 - Compras que forman parte del Costo de Venta', default_classification: 'COMPRA_INVENTARIO', default_itbis_rate: 18, icon: 'Boxes', color: '#F59E0B' },
  { name: 'Servicios Profesionales, Legales y Auditoría', code: 'CAT-PROF-07', account_code: '6102-01', dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios', default_itbis_rate: 18, icon: 'Scale', color: '#14B8A6' },
  { name: 'Arrendamiento de Locales e Inmuebles', code: 'CAT-ARRE-08', account_code: '6103-01', dgii_type_code: '03 - Arrendamientos', default_itbis_rate: 18, icon: 'Building2', color: '#0EA5E9' }
];

const API_SCOPES: ApiKeyScope[] = [
  { id: 'scope_ocr_process', code: 'ocr:process', name: 'Extracción Fiscal OCR con IA', description: 'Procesar comprobantes con OCR.', category: 'OCR' },
  { id: 'scope_expenses_read', code: 'expenses:read', name: 'Consulta de Erogaciones', description: 'Consultar comprobantes fiscales.', category: 'EXPENSES' },
  { id: 'scope_expenses_write', code: 'expenses:write', name: 'Creación y Registro de Gastos', description: 'Crear y actualizar comprobantes.', category: 'EXPENSES' },
  { id: 'scope_dgii_export', code: 'dgii:export', name: 'Exportación Fiscal DGII 606', description: 'Generar reportes DGII 606.', category: 'DGII' },
  { id: 'scope_suppliers_read', code: 'suppliers:read', name: 'Consulta de Proveedores y RNC', description: 'Consultar proveedores.', category: 'SUPPLIERS' },
  { id: 'scope_companies_read', code: 'companies:read', name: 'Estructura Corporativa y Sedes', description: 'Consultar empresas y sucursales.', category: 'COMPANIES' }
];

export class PrismaRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    // Development and tests use the same SQL path with SQLite when no URL is supplied.
    // Production never falls back to a file or an in-memory store.
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production') {
        throw new RepositoryError('DATABASE_URL es obligatorio en producción.', 500, 'DATABASE_URL_REQUIRED');
      }
      process.env.DATABASE_URL = 'file:./dev.db';
    }
    this.prisma = new PrismaClient();
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  async ensureConnected(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new RepositoryError('La base de datos SQL no está disponible.', 503, 'DATABASE_UNAVAILABLE');
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  private toOrganization(o: OrganizationRow): Organization {
    return {
      id: o.id,
      name: o.name,
      rnc: o.rnc,
      currency: o.currency as any,
      plan: o.plan as any,
      logo_url: o.logo_url || undefined,
      address: o.address || undefined,
      phone: o.phone || undefined,
      is_active: o.is_active,
      onboarding_step: o.onboarding_step,
      onboarding_done_at: iso(o.onboarding_done_at),
      monthly_scans_used: o.monthly_scans_used,
      monthly_scans_limit: o.monthly_scans_limit,
      storage_mb_used: o.storage_mb_used,
      storage_mb_limit: o.storage_mb_limit,
      created_at: new Date(o.created_at).toISOString(),
      updated_at: iso(o.updated_at)
    };
  }

  private toUser(u: UserRow, includePassword = false): User {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar || undefined,
      role: u.role,
      platform_role: u.platform_role as any,
      organization_id: u.organization_id,
      department: u.department || undefined,
      status: u.status as any,
      is_active: u.is_active,
      ...(includePassword ? { password_hash: u.password_hash } : {}),
      created_at: iso(u.created_at),
      updated_at: iso(u.updated_at)
    };
  }

  private toCompany(c: CompanyRow): Company {
    return {
      id: c.id,
      organization_id: c.organization_id,
      name: c.name,
      trade_name: c.trade_name || undefined,
      rnc: c.rnc,
      id_type: (c.id_type || 'RNC') as any,
      tax_regime: c.tax_regime as any,
      address: c.address,
      province: c.province,
      municipality: c.municipality,
      sector: c.sector || undefined,
      phone: c.phone || undefined,
      email: c.email || undefined,
      logo_url: c.logo_url || undefined,
      currency: c.currency as any,
      country: c.country,
      timezone: c.timezone || 'America/Santo_Domingo',
      is_main: c.is_main,
      status: c.status as any,
      is_active: c.is_active,
      branches_count: c._count?.branches,
      expenses_count: c._count?.expenses,
      created_by: c.created_by || undefined,
      created_at: new Date(c.created_at).toISOString(),
      updated_at: new Date(c.updated_at).toISOString()
    };
  }

  private toBranch(b: BranchRow): Branch {
    return {
      id: b.id,
      company_id: b.company_id,
      organization_id: b.organization_id,
      name: b.name,
      code: b.code,
      address: b.address,
      province: b.province || undefined,
      municipality: b.municipality || undefined,
      phone: b.phone || undefined,
      responsible: b.responsible || undefined,
      status: b.status as any,
      is_active: b.is_active,
      created_by: b.created_by || undefined,
      created_at: new Date(b.created_at).toISOString(),
      updated_at: new Date(b.updated_at).toISOString()
    };
  }

  private toLineItem(item: any): LineItem {
    return {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      itbis_rate: item.itbis_rate,
      total: item.total,
      sku: item.sku || undefined,
      cost_center_id: item.cost_center_id || undefined,
      project_id: item.project_id || undefined
    };
  }

  private toExpense(e: ExpenseRow): ExpenseRecord {
    return {
      id: e.id,
      external_id: e.external_id || undefined,
      idempotency_key: e.idempotency_key || undefined,
      organization_id: e.organization_id,
      company_id: e.company_id,
      branch_id: e.branch_id,
      created_by_user_id: e.created_by_user_id,
      created_by_name: e.created_by_name,
      created_by_user_name: e.created_by_name,
      date: e.expense_date,
      expense_date: e.expense_date,
      supplier_name: e.supplier_name,
      supplier_rnc: e.supplier_rnc,
      supplier_id: e.supplier_id || undefined,
      ncf: e.ncf,
      ncf_type: e.ncf_type as any,
      document_type: e.document_type as any,
      classification: e.classification as any,
      expense_category: e.expense_category,
      cost_center_id: e.cost_center_id || undefined,
      project_id: e.project_id || undefined,
      vehicle_id: e.vehicle_id || undefined,
      subtotal: e.subtotal,
      itbis_amount: e.itbis_amount,
      legal_tip_amount: e.legal_tip_amount,
      other_taxes: e.other_taxes,
      total_amount: e.total_amount,
      currency: e.currency as any,
      payment_method: e.payment_method as any,
      dgii_expense_type: e.dgii_expense_type || undefined,
      dgii_payment_type: e.dgii_payment_type || undefined,
      status: e.status as any,
      approval_notes: e.approval_notes || undefined,
      correction_request_note: e.correction_request_note || undefined,
      reviewed_by: e.reviewed_by || undefined,
      reviewed_at: iso(e.reviewed_at),
      receipt_image_url: e.receipt_image_url || undefined,
      ocr_raw_text: e.ocr_raw_text || undefined,
      ai_confidence_score: e.ai_confidence_score,
      ai_provider_used: e.ai_provider_used as any,
      ai_model_used: e.ai_model_used,
      line_items: (e.line_items || []).map((item: any) => this.toLineItem(item)),
      created_at: new Date(e.created_at).toISOString(),
      updated_at: new Date(e.updated_at).toISOString(),
      all_sender_sync_id: e.all_sender_sync_id || undefined,
      all_sender_synced_at: iso(e.all_sender_synced_at),
      erp_sync_status: e.erp_sync_status as any,
      erp_sync_error: e.erp_sync_error || undefined,
      erp_synced_at: iso(e.erp_synced_at),
      erp_response_payload: e.erp_response_payload || undefined
    };
  }

  private toRole(role: any): RoleDefinition {
    return {
      id: role.id,
      organization_id: role.organization_id,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      color: role.color || undefined,
      permissions: parseJson<string[]>(role.permissions, []),
      created_at: new Date(role.created_at).toISOString(),
      updated_at: new Date(role.updated_at).toISOString()
    };
  }

  private toApiKey(key: any): ApiKey {
    return {
      id: key.id,
      organization_id: key.organization_id,
      company_id: key.company_id,
      company_name: key.company?.name,
      branch_id: key.branch_id || undefined,
      branch_name: key.branch?.name,
      name: key.name,
      // The verifier hash is never part of a public API response.
      key_hash: '',
      masked_key: key.masked_key,
      key_prefix: key.key_prefix || undefined,
      scopes: normalizedScopes(parseJson<string[]>(key.scopes, [])),
      expires_at: key.expires_at ? new Date(key.expires_at).toISOString() : null,
      last_used_at: key.last_used_at ? new Date(key.last_used_at).toISOString() : null,
      total_requests: key.total_requests || 0,
      request_count: key.total_requests || 0,
      is_active: key.is_active,
      status: key.status as any,
      created_by: key.created_by,
      created_at: new Date(key.created_at).toISOString(),
      updated_at: new Date(key.updated_at).toISOString()
    };
  }

  private toApiKeyLog(log: any): ApiKeyLog {
    return {
      id: log.id,
      api_key_id: log.api_key_id || 'unknown_or_invalid',
      api_key_name: log.api_key?.name,
      organization_id: log.organization_id || 'unknown',
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.status_code,
      ip_address: log.ip_address,
      latency_ms: log.latency_ms,
      duration_ms: log.latency_ms,
      created_at: new Date(log.created_at).toISOString()
    };
  }

  private toCategory(row: any): ExpenseCategory {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      code: row.code,
      account_code: row.account_code,
      dgii_type_code: row.dgii_type_code,
      default_classification: row.default_classification as any,
      default_itbis_rate: row.default_itbis_rate,
      monthly_budget: row.monthly_budget,
      icon: row.icon || undefined,
      color: row.color || undefined,
      is_active: row.is_active,
      is_system: row.is_system,
      requires_approval_above: row.requires_approval_above ?? undefined,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  private toCostCenter(row: any): CostCenter {
    return {
      id: row.id,
      organization_id: row.organization_id,
      code: row.code,
      name: row.name,
      manager_name: row.manager_name || undefined,
      budget_monthly: row.budget_monthly,
      spent_current_month: row.spent_current_month
    };
  }

  private toSupplier(row: any): Supplier {
    return {
      id: row.id,
      organization_id: row.organization_id,
      rnc: row.rnc,
      name: row.name,
      trade_name: row.trade_name || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      category_default: row.category_default || undefined,
      status_dgii: row.status_dgii as any,
      total_invoiced: row.total_invoiced,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  private toProject(row: any): Project {
    return { id: row.id, organization_id: row.organization_id, code: row.code, name: row.name, client_name: row.client_name || undefined, budget: row.budget, spent: row.spent, status: row.status as any };
  }

  private toVehicle(row: any): Vehicle {
    return { id: row.id, organization_id: row.organization_id, plate: row.plate, brand: row.brand, model: row.model, driver_name: row.driver_name || undefined, fuel_type: row.fuel_type as any, total_fuel_spent: row.total_fuel_spent, last_mileage: row.last_mileage ?? undefined };
  }

  private toReceipt(row: any): ReceiptRecord {
    return {
      id: row.id,
      organization_id: row.organization_id,
      status: row.status as any,
      image_url: row.image_url || undefined,
      image_base64: row.image_base64 || undefined,
      file_name: row.file_name || undefined,
      mime_type: row.mime_type || undefined,
      extraction: parseJson(row.extraction_json, undefined),
      fiscal_validation: parseJson(row.fiscal_validation_json, undefined),
      meta: parseJson(row.meta_json, undefined),
      error: row.error || undefined,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at || row.created_at).toISOString()
    };
  }

  private toAIProvider(row: any): AIProviderConfig {
    return {
      id: row.id,
      organization_id: row.organization_id,
      provider_type: row.provider_type as any,
      name: row.name,
      masked_key: row.masked_key,
      has_key: row.has_key,
      selected_model: row.selected_model,
      available_models: parseJson<string[]>(row.available_models, []),
      is_active: row.is_active,
      is_primary: row.is_primary,
      is_secondary_fallback: row.is_secondary_fallback,
      total_requests: row.total_requests,
      total_tokens: row.total_tokens,
      last_used_at: iso(row.last_used_at),
      status: row.status as any,
      last_test_message: row.last_test_message || undefined,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  private toAIUsageLog(row: any): AIUsageLog {
    return {
      id: row.id,
      organization_id: row.organization_id,
      provider_type: row.provider_type as any,
      model: row.model,
      expense_id: row.expense_id || undefined,
      action: row.action as any,
      tokens_prompt: row.tokens_prompt,
      tokens_completion: row.tokens_completion,
      duration_ms: row.duration_ms,
      status: row.status as any,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  private toERPConfig(row: any, includeEncryptedKey = false): ERPConfig {
    return {
      organization_id: row.organization_id,
      is_enabled: row.is_enabled,
      api_endpoint: row.api_endpoint,
      api_key_masked: row.api_key_masked,
      ...(includeEncryptedKey && row.encrypted_api_key ? { encrypted_api_key: row.encrypted_api_key } : {}),
      target_company_id: row.target_company_id || undefined,
      target_branch_id: row.target_branch_id || undefined,
      auto_sync_on_approval: row.auto_sync_on_approval,
      ledger_account_default: row.ledger_account_default,
      last_sync_time: iso(row.last_sync_time),
      last_test_time: iso(row.last_test_time),
      last_error_message: row.last_error_message || undefined,
      sync_status: row.sync_status as any
    };
  }

  private toWebhook(row: any): WebhookSubscription {
    return {
      id: row.id,
      organization_id: row.organization_id,
      url: row.url,
      events: parseJson<string[]>(row.events, []) as any,
      secret: row.secret,
      is_active: row.is_active,
      created_at: new Date(row.created_at).toISOString(),
      last_triggered_at: iso(row.last_triggered_at)
    };
  }

  private async auditTx(tx: any, data: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await tx.auditLog.create({
      data: {
        organization_id: data.organization_id,
        user_id: data.user_id,
        user_name: data.user_name,
        impersonated_by: data.impersonated_by,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        details: data.details,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        request_id: data.request_id
      }
    });
  }

  // ----------------------------------------------------
  // Organizations and onboarding
  // ----------------------------------------------------
  async getOrganizations(includeInactive = false): Promise<Organization[]> {
    const orgs = await this.prisma.organization.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: { created_at: 'asc' }
    });
    return orgs.map(o => this.toOrganization(o));
  }

  async getOrganizationById(orgId: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return org ? this.toOrganization(org) : null;
  }

  async saveOrganization(data: Partial<Organization>): Promise<Organization> {
    const orgId = data.id || id('org');
    const existing = data.id ? await this.prisma.organization.findUnique({ where: { id: data.id } }) : null;
    const saved = existing
      ? await this.prisma.organization.update({
          where: { id: orgId },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.rnc !== undefined ? { rnc: data.rnc } : {}),
            ...(data.currency !== undefined ? { currency: data.currency } : {}),
            ...(data.plan !== undefined ? { plan: data.plan } : {}),
            ...(data.logo_url !== undefined ? { logo_url: data.logo_url } : {}),
            ...(data.address !== undefined ? { address: data.address } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
            ...(data.onboarding_step !== undefined ? { onboarding_step: data.onboarding_step } : {}),
            ...(data.onboarding_done_at !== undefined ? { onboarding_done_at: data.onboarding_done_at ? new Date(data.onboarding_done_at) : null } : {})
          }
        })
      : await this.prisma.organization.create({
          data: {
            id: orgId,
            name: data.name || 'Nueva Organización',
            rnc: data.rnc || '000000000',
            currency: data.currency || 'DOP',
            plan: data.plan || 'STARTER',
            logo_url: data.logo_url,
            address: data.address,
            phone: data.phone,
            is_active: data.is_active ?? true,
            onboarding_step: data.onboarding_step ?? 1,
            onboarding_done_at: data.onboarding_done_at ? new Date(data.onboarding_done_at) : undefined
          }
        });
    return this.toOrganization(saved);
  }

  private async ensureTenantDefaults(orgId: string): Promise<void> {
    const [roleCount, categoryCount] = await Promise.all([
      this.prisma.role.count({ where: { organization_id: orgId } }),
      this.prisma.expenseCategory.count({ where: { organization_id: orgId } })
    ]);
    if (roleCount === 0) {
      const roles = defaultRolesForOrg(orgId);
      await this.prisma.role.createMany({ data: roles.map(role => ({
        id: role.id,
        organization_id: orgId,
        code: role.code,
        name: role.name,
        description: role.description,
        is_system: true,
        color: role.color,
        permissions: JSON.stringify(role.permissions)
      })) });
    }
    if (categoryCount === 0) {
      await this.prisma.expenseCategory.createMany({ data: DEFAULT_CATEGORIES.map((category, index) => ({
        id: `${orgId}::category::${index + 1}`,
        organization_id: orgId,
        name: category.name!,
        code: category.code!,
        account_code: category.account_code!,
        dgii_type_code: category.dgii_type_code!,
        default_classification: category.default_classification || 'GASTO_OPERATIVO',
        default_itbis_rate: category.default_itbis_rate ?? 18,
        monthly_budget: 0,
        icon: category.icon,
        color: category.color,
        is_active: true,
        is_system: true
      })) });
    }
  }

  // ----------------------------------------------------
  // PostgreSQL-backed RBAC
  // ----------------------------------------------------
  async getPermissionsCatalog(): Promise<PermissionDefinition[]> {
    return PERMISSIONS.map(permission => ({ ...permission }));
  }

  async getRoles(orgId: string): Promise<RoleDefinition[]> {
    await this.ensureTenantDefaults(orgId);
    const roles = await this.prisma.role.findMany({ where: { organization_id: orgId }, orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }] });
    return roles.map(role => this.toRole(role));
  }

  async getRoleById(orgId: string, roleId: string): Promise<RoleDefinition | null> {
    await this.ensureTenantDefaults(orgId);
    const role = await this.prisma.role.findFirst({ where: { organization_id: orgId, OR: [{ id: roleId }, { code: roleId }, { name: roleId }] } });
    return role ? this.toRole(role) : null;
  }

  async saveRole(orgId: string, roleData: Partial<RoleDefinition>, performedByUserId: string, performedByName: string): Promise<{ role?: RoleDefinition; error?: string }> {
    if (!roleData.name?.trim()) return { error: 'El nombre del rol es obligatorio.' };
    await this.ensureTenantDefaults(orgId);
    const permissions = Array.isArray(roleData.permissions) ? roleData.permissions : ['expenses.create_ocr', 'expenses.create_manual', 'expenses.edit'];
    const allowedKeys = new Set(PERMISSIONS.map(permission => permission.key));
    if (permissions.some(permission => permission !== '*' && !allowedKeys.has(permission))) {
      return { error: 'La matriz contiene permisos no reconocidos.' };
    }
    const existing = roleData.id ? await this.prisma.role.findFirst({ where: { id: roleData.id, organization_id: orgId } }) : null;
    if (roleData.id && !existing) return { error: 'Rol no encontrado en esta organización.' };
    const duplicate = await this.prisma.role.findFirst({ where: { organization_id: orgId, name: roleData.name.trim(), ...(existing ? { NOT: { id: existing.id } } : {}) } });
    if (duplicate) return { error: `Ya existe un rol con el nombre "${roleData.name.trim()}".` };
    const code = (roleData as any).code || existing?.code || `ROLE_${roleData.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 24)}_${crypto.randomBytes(3).toString('hex')}`;
    const saved = await this.prisma.$transaction(async tx => {
      const role = existing
        ? await tx.role.update({ where: { id: existing.id }, data: { name: roleData.name!.trim(), description: roleData.description?.trim() || existing.description, color: roleData.color || existing.color, permissions: JSON.stringify(permissions) } })
        : await tx.role.create({ data: { id: id('role'), organization_id: orgId, code, name: roleData.name!.trim(), description: roleData.description?.trim() || 'Rol personalizado para colaboradores del entorno SaaS', color: roleData.color || 'purple', permissions: JSON.stringify(permissions), is_system: false } });
      await this.auditTx(tx, { organization_id: orgId, user_id: performedByUserId, user_name: performedByName, action: existing ? 'ACTUALIZAR_ROL' : 'CREAR_ROL', entity_type: 'ROLE', entity_id: role.id, details: `${existing ? 'Actualizó' : 'Creó'} el rol "${role.name}" con ${permissions.length} permisos.` });
      return role;
    });
    return { role: this.toRole(saved) };
  }

  async deleteRole(orgId: string, roleId: string, performedByUserId: string, performedByName: string): Promise<{ success: boolean; message: string }> {
    const role = await this.prisma.role.findFirst({ where: { organization_id: orgId, id: roleId } });
    if (!role) return { success: false, message: 'El rol que intentas eliminar no existe.' };
    if (role.is_system) return { success: false, message: 'No se pueden eliminar los roles base del sistema.' };
    const assignedUsers = await this.prisma.user.count({ where: { organization_id: orgId, OR: [{ role: role.id }, { role: role.code }] } });
    if (assignedUsers > 0) return { success: false, message: `No se puede eliminar el rol "${role.name}" porque tiene usuarios asignados.` };
    await this.prisma.$transaction(async tx => {
      await tx.role.delete({ where: { id: role.id } });
      await this.auditTx(tx, { organization_id: orgId, user_id: performedByUserId, user_name: performedByName, action: 'ELIMINAR_ROL', entity_type: 'ROLE', entity_id: role.id, details: `Eliminó el rol personalizado "${role.name}".` });
    });
    return { success: true, message: `Rol "${role.name}" eliminado satisfactoriamente.` };
  }

  async updateRbacMatrix(orgId: string, updates: Array<{ roleId: string; permissions: string[] }>, performedByUserId: string, performedByName: string): Promise<{ roles: RoleDefinition[]; message: string }> {
    await this.ensureTenantDefaults(orgId);
    const allowedKeys = new Set(PERMISSIONS.map(permission => permission.key));
    await this.prisma.$transaction(async tx => {
      for (const update of updates) {
        const role = await tx.role.findFirst({ where: { id: update.roleId, organization_id: orgId } });
        if (!role) continue;
        if (update.permissions.some(permission => permission !== '*' && !allowedKeys.has(permission))) {
          throw new RepositoryError('La matriz contiene permisos no reconocidos.', 400, 'RBAC_PERMISSION_INVALID');
        }
        await tx.role.update({ where: { id: role.id }, data: { permissions: JSON.stringify(update.permissions) } });
      }
      await this.auditTx(tx, { organization_id: orgId, user_id: performedByUserId, user_name: performedByName, action: 'ACTUALIZAR_MATRIZ_RBAC', entity_type: 'ROLE', entity_id: 'RBAC_MATRIX', details: `Actualizó la matriz RBAC para ${updates.length} roles.` });
    });
    return { roles: await this.getRoles(orgId), message: 'Matriz de permisos RBAC actualizada y guardada correctamente.' };
  }

  async resetRbacMatrix(orgId: string, performedByUserId: string, performedByName: string): Promise<{ roles: RoleDefinition[]; message: string }> {
    const current = await this.prisma.role.findMany({ where: { organization_id: orgId } });
    const custom = current.filter(role => !role.is_system);
    for (const role of custom) {
      const assigned = await this.prisma.user.count({ where: { organization_id: orgId, OR: [{ role: role.id }, { role: role.code }] } });
      if (assigned > 0) return { roles: current.map(role => this.toRole(role)), message: `No se puede restablecer: el rol "${role.name}" tiene usuarios asignados.` };
    }
    const defaults = defaultRolesForOrg(orgId);
    await this.prisma.$transaction(async tx => {
      if (custom.length > 0) await tx.role.deleteMany({ where: { organization_id: orgId, is_system: false } });
      for (const role of defaults) {
        const existing = await tx.role.findFirst({ where: { organization_id: orgId, code: role.code } });
        if (existing) {
          await tx.role.update({ where: { id: existing.id }, data: { name: role.name, description: role.description, color: role.color, is_system: true, permissions: JSON.stringify(role.permissions) } });
        } else {
          await tx.role.create({ data: { id: role.id, organization_id: orgId, code: role.code, name: role.name, description: role.description, color: role.color, is_system: true, permissions: JSON.stringify(role.permissions) } });
        }
      }
      await this.auditTx(tx, { organization_id: orgId, user_id: performedByUserId, user_name: performedByName, action: 'RESET_MATRIZ_RBAC', entity_type: 'ROLE', entity_id: 'RBAC_MATRIX', details: 'Restableció la matriz RBAC a los valores institucionales.' });
    });
    return { roles: await this.getRoles(orgId), message: 'Matriz RBAC restablecida exitosamente a valores estándar.' };
  }

  async checkUserPermission(orgId: string, userId: string, permissionKey: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organization_id: orgId, is_active: true } });
    if (!user) return false;
    const membership = await this.prisma.membership.findFirst({ where: { organization_id: orgId, user_id: user.id, is_active: true } });
    if (!membership) return false;
    if (user.role === 'ADMIN' || membership.role === 'ADMIN') return true;
    const role = await this.prisma.role.findFirst({ where: { organization_id: orgId, OR: [{ id: user.role }, { code: user.role }, { id: membership.role }, { code: membership.role }] } });
    if (!role) return false;
    const permissions = parseJson<string[]>(role.permissions, []);
    return permissions.includes('*') || permissions.includes(permissionKey);
  }

  // ----------------------------------------------------
  // PostgreSQL-backed API keys and request telemetry
  // ----------------------------------------------------
  async getApiKeyScopes(): Promise<ApiKeyScope[]> {
    return API_SCOPES.map(scope => ({ ...scope }));
  }

  async getApiKeys(orgId: string): Promise<ApiKey[]> {
    const keys = await this.prisma.apiKey.findMany({ where: { organization_id: orgId }, include: { company: true, branch: true }, orderBy: { created_at: 'desc' } });
    return keys.map(key => this.toApiKey(key));
  }

  async createApiKey(orgId: string, data: { name: string; company_id: string; branch_id?: string; scopes: string[]; expires_at?: string | null }, userId: string, userName: string): Promise<{ apiKey: ApiKey; rawKey: string; error?: string }> {
    if (!data.company_id) return { apiKey: null as any, rawKey: '', error: 'Debe asociar la API Key a una empresa filial.' };
    const company = await this.prisma.company.findFirst({ where: { id: data.company_id, organization_id: orgId, is_active: true } });
    if (!company) return { apiKey: null as any, rawKey: '', error: 'La empresa seleccionada no es válida.' };
    if (data.branch_id) {
      const branch = await this.prisma.branch.findFirst({ where: { id: data.branch_id, organization_id: orgId, company_id: company.id, is_active: true } });
      if (!branch) return { apiKey: null as any, rawKey: '', error: 'La sucursal seleccionada no es válida para esa empresa.' };
    }
    const scopes = normalizedScopes(data.scopes || []).filter(Boolean);
    if (scopes.length === 0) return { apiKey: null as any, rawKey: '', error: 'Debe seleccionar al menos un scope.' };
    const allowed = new Set(API_SCOPES.map(scope => scope.code));
    if (scopes.some(scope => scope !== '*' && !allowed.has(scope))) return { apiKey: null as any, rawKey: '', error: 'La API Key contiene scopes no reconocidos.' };
    const generated = generateRawApiKey();
    const saved = await this.prisma.$transaction(async tx => {
      const key = await tx.apiKey.create({
        data: {
          id: id('key'),
          organization_id: orgId,
          company_id: company.id,
          branch_id: data.branch_id || null,
          name: data.name?.trim() || 'Integración externa',
          key_hash: generated.keyHash,
          masked_key: generated.maskedKey,
          key_prefix: generated.prefix,
          scopes: JSON.stringify(scopes),
          expires_at: data.expires_at ? new Date(data.expires_at) : null,
          created_by: userId,
          is_active: true,
          status: 'ACTIVE'
        },
        include: { company: true, branch: true }
      });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'CREAR_API_KEY', entity_type: 'API_KEY', entity_id: key.id, details: `Generó API Key "${key.name}" para "${company.name}" con scopes [${scopes.join(', ')}].` });
      return key;
    });
    return { apiKey: this.toApiKey(saved), rawKey: generated.rawKey };
  }

  async regenerateApiKey(orgId: string, keyId: string, userId: string, userName: string): Promise<{ apiKey: ApiKey; rawKey: string; error?: string }> {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: keyId, organization_id: orgId } });
    if (!existing) return { apiKey: null as any, rawKey: '', error: 'API Key no encontrada' };
    const generated = generateRawApiKey();
    const saved = await this.prisma.$transaction(async tx => {
      const key = await tx.apiKey.update({ where: { id: existing.id }, data: { key_hash: generated.keyHash, key_prefix: generated.prefix, masked_key: generated.maskedKey, is_active: true, status: 'ACTIVE' }, include: { company: true, branch: true } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'REGENERAR_API_KEY', entity_type: 'API_KEY', entity_id: key.id, details: `Regeneró la credencial de API Key "${key.name}".` });
      return key;
    });
    return { apiKey: this.toApiKey(saved), rawKey: generated.rawKey };
  }

  async updateApiKeyStatus(orgId: string, keyId: string, isActive: boolean, userId: string, userName: string): Promise<{ success: boolean; apiKey?: ApiKey }> {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: keyId, organization_id: orgId } });
    if (!existing) return { success: false };
    const key = await this.prisma.$transaction(async tx => {
      const updated = await tx.apiKey.update({ where: { id: keyId }, data: { is_active: isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' }, include: { company: true, branch: true } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'REVOCAR_API_KEY', entity_type: 'API_KEY', entity_id: keyId, details: `${isActive ? 'Activó' : 'Desactivó'} temporalmente la API Key "${updated.name}".` });
      return updated;
    });
    return { success: true, apiKey: this.toApiKey(key) };
  }

  async revokeApiKey(orgId: string, keyId: string, userId: string, userName: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: keyId, organization_id: orgId } });
    if (!existing) return { success: false, message: 'API Key no encontrada' };
    await this.prisma.$transaction(async tx => {
      await tx.apiKey.update({ where: { id: keyId }, data: { is_active: false, status: 'REVOKED' } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'REVOCAR_API_KEY', entity_type: 'API_KEY', entity_id: keyId, details: `Revocó permanentemente la API Key "${existing.name}".` });
    });
    return { success: true, message: `API Key "${existing.name}" revocada exitosamente.` };
  }

  async validateRawApiKey(rawKey: string, requiredScope?: string): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
    if (!rawKey) return { valid: false, error: 'Cabecera de autenticación API Key ausente.' };
    const cleanKey = rawKey.startsWith('Bearer ') ? rawKey.substring(7).trim() : rawKey.trim();
    const key = await this.prisma.apiKey.findUnique({ where: { key_hash: hashApiKey(cleanKey) }, include: { company: true, branch: true } });
    if (!key) return { valid: false, error: 'API Key no válida o no encontrada.' };
    if (!key.is_active || key.status !== 'ACTIVE') return { valid: false, error: `La API Key está ${key.status === 'REVOKED' ? 'revocada' : 'inactiva'}.` };
    if (key.expires_at && key.expires_at < nowDate()) {
      await this.prisma.apiKey.update({ where: { id: key.id }, data: { is_active: false, status: 'EXPIRED' } });
      return { valid: false, error: 'La API Key ha expirado.' };
    }
    const scopes = normalizedScopes(parseJson<string[]>(key.scopes, []));
    if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('*')) return { valid: false, error: `Permiso insuficiente: la API Key requiere el scope "${requiredScope}".` };
    const updated = await this.prisma.apiKey.update({ where: { id: key.id }, data: { total_requests: { increment: 1 }, last_used_at: nowDate() }, include: { company: true, branch: true } });
    return { valid: true, apiKey: this.toApiKey(updated) };
  }

  async logApiRequest(log: Omit<ApiKeyLog, 'id' | 'created_at'>): Promise<void> {
    if (!log.api_key_id || log.api_key_id === 'unknown_or_invalid' || !log.organization_id || log.organization_id === 'unknown') return;
    await this.prisma.apiKeyLog.create({ data: { id: id('apilog'), api_key_id: log.api_key_id, organization_id: log.organization_id, endpoint: log.endpoint, method: log.method, status_code: log.status_code, ip_address: log.ip_address, latency_ms: log.latency_ms } });
  }

  async getApiKeyLogs(orgId: string, limit = 50): Promise<ApiKeyLog[]> {
    const logs = await this.prisma.apiKeyLog.findMany({ where: { organization_id: orgId }, include: { api_key: true }, orderBy: { created_at: 'desc' }, take: limit });
    return logs.map(log => this.toApiKeyLog(log));
  }

  // ----------------------------------------------------
  // PostgreSQL-backed catalogs
  // ----------------------------------------------------
  async getCategories(orgId: string): Promise<ExpenseCategory[]> {
    await this.ensureTenantDefaults(orgId);
    const rows = await this.prisma.expenseCategory.findMany({ where: { organization_id: orgId }, orderBy: { created_at: 'asc' } });
    return rows.map(row => this.toCategory(row));
  }

  async saveCategory(orgId: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const existing = data.id ? await this.prisma.expenseCategory.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    const saved = existing
      ? await this.prisma.expenseCategory.update({ where: { id: existing.id }, data: {
          name: data.name ?? existing.name, code: data.code ?? existing.code, account_code: data.account_code ?? existing.account_code,
          dgii_type_code: data.dgii_type_code ?? existing.dgii_type_code, default_classification: data.default_classification ?? existing.default_classification,
          default_itbis_rate: data.default_itbis_rate ?? existing.default_itbis_rate, monthly_budget: data.monthly_budget ?? existing.monthly_budget,
          icon: data.icon !== undefined ? data.icon : existing.icon, color: data.color !== undefined ? data.color : existing.color,
          is_active: data.is_active ?? existing.is_active, requires_approval_above: data.requires_approval_above !== undefined ? data.requires_approval_above : existing.requires_approval_above
        } })
      : await this.prisma.expenseCategory.create({ data: {
          id: data.id || id('cat'), organization_id: orgId, name: data.name || 'Nueva Categoría', code: data.code || `CAT-${Date.now().toString(36).toUpperCase()}`,
          account_code: data.account_code || '6101-01', dgii_type_code: data.dgii_type_code || '02 - Gastos por Trabajos, Suministros y Servicios',
          default_classification: data.default_classification || 'GASTO_OPERATIVO', default_itbis_rate: data.default_itbis_rate ?? 18, monthly_budget: data.monthly_budget ?? 0,
          icon: data.icon || 'Tag', color: data.color || '#3B82F6', is_active: data.is_active ?? true, is_system: false, requires_approval_above: data.requires_approval_above
        } });
    return this.toCategory(saved);
  }

  async deleteCategory(orgId: string, categoryId: string): Promise<boolean> {
    const category = await this.prisma.expenseCategory.findFirst({ where: { id: categoryId, organization_id: orgId } });
    if (!category || category.is_system) return false;
    await this.prisma.expenseCategory.delete({ where: { id: categoryId } });
    return true;
  }

  async getCostCenters(orgId: string): Promise<CostCenter[]> {
    const rows = await this.prisma.costCenter.findMany({ where: { organization_id: orgId }, orderBy: { code: 'asc' } });
    return rows.map(row => this.toCostCenter(row));
  }

  async saveCostCenter(orgId: string, data: Partial<CostCenter>): Promise<CostCenter> {
    const existing = data.id ? await this.prisma.costCenter.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    const saved = existing
      ? await this.prisma.costCenter.update({ where: { id: existing.id }, data: { code: data.code ?? existing.code, name: data.name ?? existing.name, manager_name: data.manager_name !== undefined ? data.manager_name : existing.manager_name, budget_monthly: data.budget_monthly ?? existing.budget_monthly, spent_current_month: data.spent_current_month ?? existing.spent_current_month } })
      : await this.prisma.costCenter.create({ data: { id: data.id || id('cc'), organization_id: orgId, code: data.code || `CC-${Date.now().toString(36).toUpperCase()}`, name: data.name || 'Nuevo Centro de Costo', manager_name: data.manager_name, budget_monthly: data.budget_monthly ?? 0, spent_current_month: data.spent_current_month ?? 0 } });
    return this.toCostCenter(saved);
  }

  async deleteCostCenter(orgId: string, centerId: string): Promise<boolean> {
    const existing = await this.prisma.costCenter.findFirst({ where: { id: centerId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.costCenter.delete({ where: { id: centerId } });
    return true;
  }

  async getSuppliers(orgId: string): Promise<Supplier[]> {
    const rows = await this.prisma.supplier.findMany({ where: { organization_id: orgId }, orderBy: { name: 'asc' } });
    return rows.map(row => this.toSupplier(row));
  }

  async saveSupplier(orgId: string, data: Partial<Supplier>): Promise<Supplier> {
    const existing = data.id ? await this.prisma.supplier.findFirst({ where: { id: data.id, organization_id: orgId } }) : data.rnc ? await this.prisma.supplier.findFirst({ where: { organization_id: orgId, rnc: data.rnc } }) : null;
    const saved = existing
      ? await this.prisma.supplier.update({ where: { id: existing.id }, data: { rnc: data.rnc ?? existing.rnc, name: data.name ?? existing.name, trade_name: data.trade_name !== undefined ? data.trade_name : existing.trade_name, phone: data.phone !== undefined ? data.phone : existing.phone, email: data.email !== undefined ? data.email : existing.email, category_default: data.category_default !== undefined ? data.category_default : existing.category_default, status_dgii: data.status_dgii ?? existing.status_dgii, total_invoiced: data.total_invoiced ?? existing.total_invoiced } })
      : await this.prisma.supplier.create({ data: { id: data.id || id('sup'), organization_id: orgId, rnc: data.rnc || '', name: data.name || 'Proveedor Nuevo', trade_name: data.trade_name || data.name, phone: data.phone, email: data.email, category_default: data.category_default, status_dgii: data.status_dgii || 'ACTIVO', total_invoiced: data.total_invoiced ?? 0 } });
    return this.toSupplier(saved);
  }

  async deleteSupplier(orgId: string, supplierId: string): Promise<boolean> {
    const existing = await this.prisma.supplier.findFirst({ where: { id: supplierId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.supplier.delete({ where: { id: supplierId } });
    return true;
  }

  async getProjects(orgId: string): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({ where: { organization_id: orgId }, orderBy: { code: 'asc' } });
    return rows.map(row => this.toProject(row));
  }

  async saveProject(orgId: string, data: Partial<Project>): Promise<Project> {
    const existing = data.id ? await this.prisma.project.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    const saved = existing
      ? await this.prisma.project.update({ where: { id: existing.id }, data: { code: data.code ?? existing.code, name: data.name ?? existing.name, client_name: data.client_name !== undefined ? data.client_name : existing.client_name, budget: data.budget ?? existing.budget, spent: data.spent ?? existing.spent, status: data.status ?? existing.status } })
      : await this.prisma.project.create({ data: { id: data.id || id('proj'), organization_id: orgId, code: data.code || `PRJ-${Date.now().toString(36).toUpperCase()}`, name: data.name || 'Nuevo Proyecto', client_name: data.client_name, budget: data.budget ?? 0, spent: data.spent ?? 0, status: data.status || 'ACTIVO' } });
    return this.toProject(saved);
  }

  async deleteProject(orgId: string, projectId: string): Promise<boolean> {
    const existing = await this.prisma.project.findFirst({ where: { id: projectId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.project.delete({ where: { id: projectId } });
    return true;
  }

  async getVehicles(orgId: string): Promise<Vehicle[]> {
    const rows = await this.prisma.vehicle.findMany({ where: { organization_id: orgId }, orderBy: { plate: 'asc' } });
    return rows.map(row => this.toVehicle(row));
  }

  async saveVehicle(orgId: string, data: Partial<Vehicle>): Promise<Vehicle> {
    const plate = data.plate?.toUpperCase();
    const existing = data.id ? await this.prisma.vehicle.findFirst({ where: { id: data.id, organization_id: orgId } }) : plate ? await this.prisma.vehicle.findFirst({ where: { organization_id: orgId, plate } }) : null;
    const saved = existing
      ? await this.prisma.vehicle.update({ where: { id: existing.id }, data: { plate: (plate || existing.plate).toUpperCase(), brand: data.brand ?? existing.brand, model: data.model ?? existing.model, driver_name: data.driver_name !== undefined ? data.driver_name : existing.driver_name, fuel_type: data.fuel_type ?? existing.fuel_type, total_fuel_spent: data.total_fuel_spent ?? existing.total_fuel_spent, last_mileage: data.last_mileage !== undefined ? data.last_mileage : existing.last_mileage } })
      : await this.prisma.vehicle.create({ data: { id: data.id || id('veh'), organization_id: orgId, plate: (plate || `G${Date.now().toString().slice(-6)}`).toUpperCase(), brand: data.brand || 'Toyota', model: data.model || 'Vehículo Corporativo', driver_name: data.driver_name, fuel_type: data.fuel_type || 'GASOLINA_PREMIUM', total_fuel_spent: data.total_fuel_spent ?? 0, last_mileage: data.last_mileage } });
    return this.toVehicle(saved);
  }

  async deleteVehicle(orgId: string, vehicleId: string): Promise<boolean> {
    const existing = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.vehicle.delete({ where: { id: vehicleId } });
    return true;
  }

  async registerTenant(input: {
    organization: Partial<Organization>;
    user: Partial<User> & { password_hash: string };
    company: Partial<Company>;
    branch?: Partial<Branch>;
  }): Promise<{ organization: Organization; user: User; company: Company; branch: Branch }> {
    const organizationId = input.organization.id || id('org');
    const userId = input.user.id || id('usr');
    const companyId = input.company.id || id('comp');
    const branchId = input.branch?.id || id('branch');
    const email = input.user.email?.trim().toLowerCase();
    if (!email || !input.user.password_hash) {
      throw new RepositoryError('El correo y el hash de contraseña son obligatorios.', 400, 'USER_CREDENTIALS_REQUIRED');
    }

    try {
      const result = await this.prisma.$transaction(async tx => {
        const org = await tx.organization.create({
          data: {
            id: organizationId,
            name: input.organization.name || 'Nueva Organización',
            rnc: input.organization.rnc || '000000000',
            currency: input.organization.currency || 'DOP',
            plan: input.organization.plan || 'STARTER',
            address: input.organization.address,
            phone: input.organization.phone,
            is_active: true
          }
        });
        const user = await tx.user.create({
          data: {
            id: userId,
            organization_id: org.id,
            email,
            name: input.user.name || 'Administrador',
            avatar: input.user.avatar,
            role: input.user.role || 'ADMIN',
            platform_role: input.user.platform_role || 'NONE',
            department: input.user.department || 'Dirección General',
            status: input.user.status || 'ACTIVE',
            is_active: input.user.is_active ?? true,
            password_hash: input.user.password_hash
          }
        });
        await tx.membership.create({
          data: { organization_id: org.id, user_id: user.id, role: user.role, status: 'ACTIVE', is_active: true }
        });
        const company = await tx.company.create({
          data: {
            id: companyId,
            organization_id: org.id,
            name: input.company.name || org.name,
            trade_name: input.company.trade_name,
            rnc: input.company.rnc || org.rnc,
            id_type: input.company.id_type || 'RNC',
            tax_regime: input.company.tax_regime || 'REGIMEN_GENERAL',
            address: input.company.address || 'Santo Domingo, República Dominicana',
            province: input.company.province || 'Santo Domingo',
            municipality: input.company.municipality || 'Distrito Nacional',
            sector: input.company.sector,
            phone: input.company.phone,
            email: input.company.email,
            logo_url: input.company.logo_url,
            currency: input.company.currency || 'DOP',
            country: input.company.country || 'Dominican Republic',
            timezone: input.company.timezone || 'America/Santo_Domingo',
            is_main: true,
            status: 'ACTIVO',
            is_active: true,
            created_by: user.id
          }
        });
        const branch = await tx.branch.create({
          data: {
            id: branchId,
            organization_id: org.id,
            company_id: company.id,
            name: input.branch?.name || 'Matriz',
            code: input.branch?.code || 'MATRIZ',
            address: input.branch?.address || company.address,
            province: input.branch?.province || company.province,
            municipality: input.branch?.municipality || company.municipality,
            phone: input.branch?.phone || company.phone,
            responsible: input.branch?.responsible || user.name,
            status: 'ACTIVO',
            is_active: true,
            created_by: user.id
          }
        });
        const roles = defaultRolesForOrg(org.id);
        await tx.role.createMany({ data: roles.map(role => ({
          id: role.id,
          organization_id: org.id,
          code: role.code,
          name: role.name,
          description: role.description,
          is_system: true,
          color: role.color,
          permissions: JSON.stringify(role.permissions)
        })) });
        await tx.expenseCategory.createMany({ data: DEFAULT_CATEGORIES.map((category, index) => ({
          id: `${org.id}::category::${index + 1}`,
          organization_id: org.id,
          name: category.name!,
          code: category.code!,
          account_code: category.account_code!,
          dgii_type_code: category.dgii_type_code!,
          default_classification: category.default_classification || 'GASTO_OPERATIVO',
          default_itbis_rate: category.default_itbis_rate ?? 18,
          monthly_budget: 0,
          icon: category.icon,
          color: category.color,
          is_active: true,
          is_system: true
        })) });
        await this.auditTx(tx, {
          organization_id: org.id,
          user_id: user.id,
          user_name: user.name,
          action: 'CREAR_USUARIO',
          entity_type: 'ORGANIZATION',
          entity_id: org.id,
          details: `Nueva organización y usuario administrador registrados (${org.name}).`
        });
        return { org, user, company, branch };
      });
      return {
        organization: this.toOrganization(result.org),
        user: this.toUser(result.user),
        company: this.toCompany(result.company),
        branch: this.toBranch(result.branch)
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new RepositoryError('Ya existe una cuenta registrada con este correo electrónico.', 409, 'USER_EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  // ----------------------------------------------------
  // Users, memberships and SQL-backed sessions
  // ----------------------------------------------------
  async getUsers(orgId: string, includeInactive = false): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { organization_id: orgId, ...(includeInactive ? {} : { is_active: true }) },
      orderBy: { created_at: 'asc' }
    });
    return users.map(u => this.toUser(u));
  }

  async getUserById(userId: string, orgId?: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, ...(orgId ? { organization_id: orgId } : {}) } });
    return user ? this.toUser(user) : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return user ? this.toUser(user, true) : null;
  }

  async saveUser(
    orgId: string,
    data: Partial<User>,
    performedByUserId = 'system',
    performedByName = 'Sistema'
  ): Promise<{ user?: User; error?: string }> {
    if (!data.name || !data.email) return { error: 'El nombre completo y el correo electrónico son obligatorios.' };
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El formato del correo electrónico no es válido.' };

    const existing = data.id ? await this.prisma.user.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    if (data.id && !existing) return { error: 'Usuario no encontrado.' };
    const duplicate = await this.prisma.user.findFirst({ where: { email, ...(data.id ? { NOT: { id: data.id } } : {}) } });
    if (duplicate) return { error: `Ya existe otro usuario registrado con el correo ${email}.` };

    // Team creation does not receive a password yet; create an unusable random hash.
    // The user can establish a password through the reset flow. Plaintext is never persisted.
    const passwordHash = data.password_hash || await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    if (data.password_hash && !data.password_hash.startsWith('$2')) {
      return { error: 'La contraseña debe recibirse únicamente como hash bcrypt.' };
    }
    const userId = existing?.id || data.id || id('usr');
    const role = data.role || existing?.role || 'EMPLOYEE';
    const saved = await this.prisma.$transaction(async tx => {
      const user = existing
        ? await tx.user.update({
            where: { id: userId },
            data: {
              email,
              name: data.name!.trim(),
              avatar: data.avatar !== undefined ? data.avatar : existing.avatar,
              role,
              platform_role: data.platform_role !== undefined ? data.platform_role : existing.platform_role,
              department: data.department?.trim() || existing.department || 'Operaciones',
              status: data.status || existing.status,
              is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
              ...(data.password_hash ? { password_hash: passwordHash } : {})
            }
          })
        : await tx.user.create({
            data: {
              id: userId,
              organization_id: orgId,
              email,
              name: data.name!.trim(),
              avatar: data.avatar,
              role,
              platform_role: data.platform_role || 'NONE',
              department: data.department?.trim() || 'Operaciones',
              status: data.status || 'ACTIVE',
              is_active: data.is_active ?? true,
              password_hash: passwordHash
            }
          });
      const membership = await tx.membership.findFirst({ where: { organization_id: orgId, user_id: user.id } });
      if (membership) {
        await tx.membership.update({ where: { id: membership.id }, data: { role, status: user.status, is_active: user.is_active } });
      } else {
        await tx.membership.create({ data: { organization_id: orgId, user_id: user.id, role, status: user.status, is_active: user.is_active } });
      }
      await this.auditTx(tx, {
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: existing ? 'ACTUALIZAR_USUARIO' : 'CREAR_USUARIO',
        entity_type: 'USER',
        entity_id: user.id,
        details: `${existing ? 'Actualizó' : 'Creó'} usuario ${user.email}.`
      });
      return user;
    });
    return { user: this.toUser(saved) };
  }

  async deactivateUser(orgId: string, userId: string, performedByUserId: string, performedByName: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organization_id: orgId } });
    if (!user) return { success: false, message: 'Usuario no encontrado.' };
    if (user.id === performedByUserId) return { success: false, message: 'No puedes desactivar tu propia cuenta activa actual.' };
    await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { status: 'INACTIVE', is_active: false } });
      await tx.membership.updateMany({ where: { organization_id: orgId, user_id: user.id }, data: { status: 'INACTIVE', is_active: false } });
      await this.auditTx(tx, {
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: 'DESACTIVAR_USUARIO',
        entity_type: 'USER',
        entity_id: user.id,
        details: `Desactivó el usuario ${user.email}.`
      });
    });
    return { success: true, message: `Usuario ${user.name} desactivado correctamente.` };
  }

  async createSession(userId: string, orgId: string, ip?: string, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organization_id: orgId, is_active: true } });
    if (!user) throw new RepositoryError('No se puede crear una sesión para un usuario inválido.', 401, 'SESSION_USER_INVALID');
    const token = `eroga_sess_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        token_hash: tokenHash(token),
        user_id: userId,
        organization_id: orgId,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt
      }
    });
    return { token, expiresAt };
  }

  async validateSessionToken(token: string): Promise<{ user: User; organization_id: string } | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({ where: { token_hash: tokenHash(token) }, include: { user: true } });
    if (!session || session.revoked_at || session.expires_at <= nowDate() || !session.user.is_active || session.user.organization_id !== session.organization_id) {
      return null;
    }
    await this.prisma.session.update({ where: { id: session.id }, data: { last_activity_at: nowDate() } });
    return { user: this.toUser(session.user), organization_id: session.organization_id };
  }

  async revokeSessionToken(token: string): Promise<boolean> {
    if (!token) return false;
    const result = await this.prisma.session.updateMany({ where: { token_hash: tokenHash(token), revoked_at: null }, data: { revoked_at: nowDate() } });
    return result.count > 0;
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new RepositoryError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
    const token = `rst_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    await this.prisma.passwordResetToken.create({ data: { token_hash: tokenHash(token), user_id: userId, expires_at: new Date(Date.now() + 3600000) } });
    return token;
  }

  async validatePasswordResetToken(token: string): Promise<User | null> {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: tokenHash(token) }, include: { user: true } });
    if (!reset || reset.used_at || reset.expires_at <= nowDate() || !reset.user.is_active) return null;
    return this.toUser(reset.user);
  }

  async consumePasswordResetToken(token: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({ where: { token_hash: tokenHash(token), used_at: null }, data: { used_at: nowDate() } });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    if (!passwordHash.startsWith('$2')) throw new RepositoryError('La contraseña debe ser un hash bcrypt.', 400, 'PASSWORD_HASH_REQUIRED');
    const result = await this.prisma.user.updateMany({ where: { id: userId }, data: { password_hash: passwordHash } });
    return result.count > 0;
  }

  // ----------------------------------------------------
  // Companies and branches
  // ----------------------------------------------------
  async getCompanies(orgId: string, includeInactive = false): Promise<Company[]> {
    const companies = await this.prisma.company.findMany({
      where: { organization_id: orgId, ...(includeInactive ? {} : { is_active: true }) },
      include: { _count: { select: { branches: true, expenses: true } } },
      orderBy: { created_at: 'asc' }
    });
    return companies.map(c => this.toCompany(c));
  }

  async getCompanyById(orgId: string, companyId: string): Promise<Company | null> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organization_id: orgId },
      include: { _count: { select: { branches: true, expenses: true } } }
    });
    return company ? this.toCompany(company) : null;
  }

  async saveCompany(orgId: string, data: Partial<Company>, userId = 'system', userName = 'Sistema'): Promise<{ company?: Company; error?: string }> {
    const organization = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization) return { error: 'La organización especificada no existe.' };
    const cleanRnc = (data.rnc || '').replace(/[^0-9]/g, '');
    const candidates = await this.prisma.company.findMany({ where: { organization_id: orgId, is_active: true, ...(data.id ? { id: { not: data.id } } : {}) }, select: { id: true, name: true, rnc: true } });
    const duplicate = candidates.find(c => c.rnc.replace(/[^0-9]/g, '') === cleanRnc && cleanRnc.length > 0);
    if (duplicate) return { error: `Ya existe una empresa activa con el RNC ${data.rnc} (${duplicate.name}) en esta organización.` };
    const existing = data.id ? await this.prisma.company.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    if (data.id && !existing) return { error: 'Empresa no encontrada.' };
    const isFirst = !existing && (await this.prisma.company.count({ where: { organization_id: orgId, is_active: true } })) === 0;
    const companyId = existing?.id || data.id || id('comp');
    const saved = await this.prisma.$transaction(async tx => {
      const isMain = data.is_main ?? existing?.is_main ?? isFirst;
      if (isMain) await tx.company.updateMany({ where: { organization_id: orgId, id: { not: companyId } }, data: { is_main: false } });
      const company = existing
        ? await tx.company.update({ where: { id: companyId }, data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.trade_name !== undefined ? { trade_name: data.trade_name } : {}),
            ...(data.rnc !== undefined ? { rnc: data.rnc } : {}),
            ...(data.id_type !== undefined ? { id_type: data.id_type } : {}),
            ...(data.tax_regime !== undefined ? { tax_regime: data.tax_regime } : {}),
            ...(data.address !== undefined ? { address: data.address } : {}),
            ...(data.province !== undefined ? { province: data.province } : {}),
            ...(data.municipality !== undefined ? { municipality: data.municipality } : {}),
            ...(data.sector !== undefined ? { sector: data.sector } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
            ...(data.logo_url !== undefined ? { logo_url: data.logo_url } : {}),
            ...(data.currency !== undefined ? { currency: data.currency } : {}),
            ...(data.country !== undefined ? { country: data.country } : {}),
            ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
            is_main: isMain,
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {})
          } })
        : await tx.company.create({ data: {
            id: companyId,
            organization_id: orgId,
            name: data.name || 'Nueva Empresa SRL',
            trade_name: data.trade_name || data.name,
            rnc: data.rnc || '000000000',
            id_type: data.id_type || 'RNC',
            tax_regime: data.tax_regime || 'REGIMEN_GENERAL',
            address: data.address || 'Santo Domingo, D.N.',
            province: data.province || 'Distrito Nacional',
            municipality: data.municipality || 'Santo Domingo de Guzmán',
            sector: data.sector,
            phone: data.phone,
            email: data.email,
            logo_url: data.logo_url,
            currency: data.currency || 'DOP',
            country: data.country || 'Dominican Republic',
            timezone: data.timezone || 'America/Santo_Domingo',
            is_main: isMain,
            status: data.status || 'ACTIVO',
            is_active: data.is_active ?? true,
            created_by: userId
          } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: existing ? 'ACTUALIZAR_EMPRESA' : 'CREAR_EMPRESA', entity_type: 'COMPANY', entity_id: company.id, details: `${existing ? 'Actualizó' : 'Creó'} la empresa ${company.name}.` });
      return company;
    });
    return { company: this.toCompany(saved) };
  }

  async deactivateCompany(orgId: string, companyId: string, userId: string, userName: string): Promise<{ success: boolean; message: string }> {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, organization_id: orgId } });
    if (!company) return { success: false, message: 'Empresa no encontrada' };
    const expenseCount = await this.prisma.expense.count({ where: { organization_id: orgId, company_id: companyId } });
    await this.prisma.$transaction(async tx => {
      await tx.company.update({ where: { id: companyId }, data: { is_active: false, status: 'INACTIVO' } });
      await tx.branch.updateMany({ where: { organization_id: orgId, company_id: companyId }, data: { is_active: false, status: 'INACTIVO' } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'DESACTIVAR_EMPRESA', entity_type: 'COMPANY', entity_id: companyId, details: `Desactivó ${company.name}. Gastos conservados: ${expenseCount}.` });
    });
    return { success: true, message: `Empresa \"${company.name}\" desactivada con éxito. Se preservaron ${expenseCount} registros vinculados.` };
  }

  async getBranches(orgId: string, companyId?: string, includeInactive = false): Promise<Branch[]> {
    const branches = await this.prisma.branch.findMany({ where: { organization_id: orgId, ...(companyId ? { company_id: companyId } : {}), ...(includeInactive ? {} : { is_active: true }) }, orderBy: { created_at: 'asc' } });
    return branches.map(b => this.toBranch(b));
  }

  async getBranchById(orgId: string, branchId: string): Promise<Branch | null> {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organization_id: orgId } });
    return branch ? this.toBranch(branch) : null;
  }

  async saveBranch(orgId: string, data: Partial<Branch>, userId = 'system', userName = 'Sistema'): Promise<{ branch?: Branch; error?: string }> {
    if (!data.company_id) return { error: 'No se puede crear una sucursal sin especificar la empresa relacionada.' };
    const company = await this.prisma.company.findFirst({ where: { id: data.company_id, organization_id: orgId } });
    if (!company) return { error: 'La empresa especificada no existe en la organización.' };
    const existing = data.id ? await this.prisma.branch.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    if (data.id && !existing) return { error: 'Sucursal no encontrada.' };
    const branchId = existing?.id || data.id || id('branch');
    const saved = await this.prisma.$transaction(async tx => {
      const branch = existing
        ? await tx.branch.update({ where: { id: branchId }, data: {
            company_id: data.company_id || existing.company_id,
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.code !== undefined ? { code: data.code } : {}),
            ...(data.address !== undefined ? { address: data.address } : {}),
            ...(data.province !== undefined ? { province: data.province } : {}),
            ...(data.municipality !== undefined ? { municipality: data.municipality } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.responsible !== undefined ? { responsible: data.responsible } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {})
          } })
        : await tx.branch.create({ data: {
            id: branchId,
            organization_id: orgId,
            company_id: data.company_id,
            name: data.name || 'Nueva Sucursal',
            code: data.code || `SUC-${Math.floor(100 + Math.random() * 900)}`,
            address: data.address || company.address,
            province: data.province || company.province,
            municipality: data.municipality || company.municipality,
            phone: data.phone || company.phone,
            responsible: data.responsible,
            status: data.status || 'ACTIVO',
            is_active: data.is_active ?? true,
            created_by: userId
          } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: existing ? 'ACTUALIZAR_SUCURSAL' : 'CREAR_SUCURSAL', entity_type: 'BRANCH', entity_id: branch.id, details: `${existing ? 'Actualizó' : 'Creó'} la sucursal ${branch.name}.` });
      return branch;
    });
    return { branch: this.toBranch(saved) };
  }

  async deactivateBranch(orgId: string, branchId: string, userId: string, userName: string): Promise<{ success: boolean; message: string }> {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organization_id: orgId } });
    if (!branch) return { success: false, message: 'Sucursal no encontrada' };
    await this.prisma.$transaction(async tx => {
      await tx.branch.update({ where: { id: branchId }, data: { is_active: false, status: 'INACTIVO' } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'DESACTIVAR_SUCURSAL', entity_type: 'BRANCH', entity_id: branchId, details: `Desactivó la sucursal ${branch.name}.` });
    });
    return { success: true, message: `Sucursal \"${branch.name}\" desactivada con éxito.` };
  }

  // ----------------------------------------------------
  // PostgreSQL-backed receipts, webhooks, AI and ERP state
  // ----------------------------------------------------
  async getReceipts(orgId: string): Promise<ReceiptRecord[]> {
    const rows = await this.prisma.receipt.findMany({ where: { organization_id: orgId }, orderBy: { created_at: 'desc' } });
    return rows.map(row => this.toReceipt(row));
  }

  async getReceiptById(orgId: string, receiptId: string): Promise<ReceiptRecord | null> {
    const row = await this.prisma.receipt.findFirst({ where: { id: receiptId, organization_id: orgId } });
    return row ? this.toReceipt(row) : null;
  }

  async saveReceipt(orgId: string, data: Partial<ReceiptRecord>): Promise<ReceiptRecord> {
    const existing = data.id ? await this.prisma.receipt.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    if (data.id && !existing) throw new RepositoryError('Comprobante no encontrado.', 404, 'RECEIPT_NOT_FOUND');
    const row = existing
      ? await this.prisma.receipt.update({ where: { id: existing.id }, data: {
          status: data.status ?? existing.status,
          image_url: data.image_url !== undefined ? data.image_url : existing.image_url,
          image_base64: data.image_base64 !== undefined ? data.image_base64 : existing.image_base64,
          file_name: data.file_name !== undefined ? data.file_name : existing.file_name,
          mime_type: data.mime_type !== undefined ? data.mime_type : existing.mime_type,
          extraction_json: data.extraction !== undefined ? JSON.stringify(data.extraction) : existing.extraction_json,
          fiscal_validation_json: data.fiscal_validation !== undefined ? JSON.stringify(data.fiscal_validation) : existing.fiscal_validation_json,
          meta_json: data.meta !== undefined ? JSON.stringify(data.meta) : existing.meta_json,
          error: data.error !== undefined ? data.error : existing.error
        } })
      : await this.prisma.receipt.create({ data: {
          id: data.id || id('receipt'), organization_id: orgId, status: data.status || 'UPLOADED', image_url: data.image_url,
          image_base64: data.image_base64, file_name: data.file_name || 'comprobante_fiscal.jpg', mime_type: data.mime_type || 'image/jpeg',
          extraction_json: data.extraction === undefined ? null : JSON.stringify(data.extraction), fiscal_validation_json: data.fiscal_validation === undefined ? null : JSON.stringify(data.fiscal_validation),
          meta_json: data.meta === undefined ? null : JSON.stringify(data.meta), error: data.error
        } });
    return this.toReceipt(row);
  }

  async getWebhooks(orgId: string): Promise<WebhookSubscription[]> {
    const rows = await this.prisma.webhookSubscription.findMany({ where: { organization_id: orgId }, orderBy: { created_at: 'desc' } });
    return rows.map(row => this.toWebhook(row));
  }

  async saveWebhook(orgId: string, data: Partial<WebhookSubscription>): Promise<WebhookSubscription> {
    const existing = data.id ? await this.prisma.webhookSubscription.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    const row = existing
      ? await this.prisma.webhookSubscription.update({ where: { id: existing.id }, data: { url: data.url ?? existing.url, events: data.events ? JSON.stringify(data.events) : existing.events, secret: data.secret ?? existing.secret, is_active: data.is_active ?? existing.is_active } })
      : await this.prisma.webhookSubscription.create({ data: { id: data.id || id('webhook'), organization_id: orgId, url: data.url || 'https://example.com/webhooks/eroga-ai', events: JSON.stringify(data.events || ['expense.created', 'expense.approved']), secret: data.secret || `whsec_${crypto.randomBytes(18).toString('hex')}`, is_active: data.is_active ?? true } });
    return this.toWebhook(row);
  }

  async deleteWebhook(orgId: string, webhookId: string): Promise<boolean> {
    const existing = await this.prisma.webhookSubscription.findFirst({ where: { id: webhookId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.webhookSubscription.delete({ where: { id: webhookId } });
    return true;
  }

  async triggerWebhooks(orgId: string, event: string, _payload: unknown): Promise<void> {
    const rows = await this.prisma.webhookSubscription.findMany({ where: { organization_id: orgId, is_active: true } });
    const matching = rows.filter(row => {
      const events = parseJson<string[]>(row.events, []);
      return events.includes(event) || events.includes('*');
    });
    if (matching.length > 0) await this.prisma.webhookSubscription.updateMany({ where: { id: { in: matching.map(row => row.id) } }, data: { last_triggered_at: nowDate() } });
  }

  async getAIProviderConfigs(orgId: string): Promise<AIProviderConfig[]> {
    const rows = await this.prisma.aIProviderConfig.findMany({ where: { organization_id: orgId }, orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }] });
    return rows.map(row => this.toAIProvider(row));
  }

  async getAIProviderById(orgId: string, providerId: string): Promise<AIProviderConfig | null> {
    const row = await this.prisma.aIProviderConfig.findFirst({ where: { id: providerId, organization_id: orgId } });
    return row ? this.toAIProvider(row) : null;
  }

  async getDecryptedAIProviderKey(orgId: string, providerId: string): Promise<string> {
    const row = await this.prisma.aIProviderConfig.findFirst({ where: { id: providerId, organization_id: orgId } });
    if (!row?.encrypted_key) return '';
    return decryptApiKey(row.encrypted_key);
  }

  async saveAIProvider(orgId: string, data: Partial<AIProviderConfig> & { api_key?: string }): Promise<AIProviderConfig> {
    const existing = data.id ? await this.prisma.aIProviderConfig.findFirst({ where: { id: data.id, organization_id: orgId } }) : null;
    const rawKey = data.api_key?.trim();
    const encryptedKey = rawKey ? encryptApiKey(rawKey) : (existing?.encrypted_key || null);
    const saved = await this.prisma.$transaction(async tx => {
      if (data.is_primary) await tx.aIProviderConfig.updateMany({ where: { organization_id: orgId, ...(existing ? { NOT: { id: existing.id } } : {}) }, data: { is_primary: false } });
      const row = existing
        ? await tx.aIProviderConfig.update({ where: { id: existing.id }, data: {
            provider_type: data.provider_type ?? existing.provider_type, name: data.name ?? existing.name, encrypted_key: encryptedKey,
            masked_key: rawKey ? maskApiKey(rawKey) : existing.masked_key, has_key: Boolean(encryptedKey), selected_model: data.selected_model ?? existing.selected_model,
            available_models: data.available_models ? JSON.stringify(data.available_models) : existing.available_models, is_active: data.is_active ?? existing.is_active,
            is_primary: data.is_primary ?? existing.is_primary, is_secondary_fallback: data.is_secondary_fallback ?? existing.is_secondary_fallback,
            status: data.status ?? existing.status, last_test_message: data.last_test_message !== undefined ? data.last_test_message : existing.last_test_message,
            last_used_at: data.last_used_at ? new Date(data.last_used_at) : existing.last_used_at
          } })
        : await tx.aIProviderConfig.create({ data: {
            id: data.id || id('aip'), organization_id: orgId, provider_type: data.provider_type || 'GEMINI', name: data.name || 'Proveedor IA', encrypted_key: encryptedKey,
            masked_key: rawKey ? maskApiKey(rawKey) : (data.masked_key || '••••••••'), has_key: Boolean(encryptedKey), selected_model: data.selected_model || 'gemini-2.5-flash',
            available_models: JSON.stringify(data.available_models || ['gemini-2.5-flash', 'gemini-2.5-pro']), is_active: data.is_active ?? true, is_primary: data.is_primary ?? false,
            is_secondary_fallback: data.is_secondary_fallback ?? false, total_requests: data.total_requests || 0, total_tokens: data.total_tokens || 0,
            status: data.status || 'UNTESTED', last_test_message: data.last_test_message, last_used_at: data.last_used_at ? new Date(data.last_used_at) : null
          } });
      await this.auditTx(tx, { organization_id: orgId, user_id: 'system', user_name: 'Sistema', action: 'CONFIG_IA', entity_type: 'SETTINGS', entity_id: row.id, details: `Actualizó la configuración del proveedor IA ${row.provider_type}.` });
      return row;
    });
    return this.toAIProvider(saved);
  }

  async getAIUsageLogs(orgId: string): Promise<AIUsageLog[]> {
    const rows = await this.prisma.aIUsageLog.findMany({ where: { organization_id: orgId }, orderBy: { created_at: 'desc' }, take: 1000 });
    return rows.map(row => this.toAIUsageLog(row));
  }

  async logAIUsage(log: Omit<AIUsageLog, 'id' | 'created_at'>): Promise<AIUsageLog> {
    const row = await this.prisma.$transaction(async tx => {
      const created = await tx.aIUsageLog.create({ data: { id: id('ai_log'), organization_id: log.organization_id, provider_type: log.provider_type, model: log.model, expense_id: log.expense_id, action: log.action, tokens_prompt: log.tokens_prompt, tokens_completion: log.tokens_completion, duration_ms: log.duration_ms, status: log.status } });
      await tx.aIProviderConfig.updateMany({ where: { organization_id: log.organization_id, provider_type: log.provider_type }, data: { total_requests: { increment: 1 }, total_tokens: { increment: log.tokens_prompt + log.tokens_completion }, last_used_at: nowDate() } });
      return created;
    });
    return this.toAIUsageLog(row);
  }

  async getERPConfig(orgId: string, includeEncryptedKey = false): Promise<ERPConfig> {
    const row = await this.prisma.eRPConfig.findUnique({ where: { organization_id: orgId } });
    if (row) return this.toERPConfig(row, includeEncryptedKey);
    return { organization_id: orgId, is_enabled: false, api_endpoint: '', api_key_masked: '', auto_sync_on_approval: false, ledger_account_default: '6105-01-000', sync_status: 'DESACTIVADO' };
  }

  async saveERPConfig(orgId: string, data: Partial<ERPConfig> & { api_key?: string }, userId: string, userName: string): Promise<ERPConfig> {
    if (data.target_company_id) {
      const company = await this.prisma.company.findFirst({ where: { id: data.target_company_id, organization_id: orgId } });
      if (!company) throw new RepositoryError('La empresa objetivo ERP no pertenece a la organización.', 422, 'ERP_COMPANY_SCOPE_INVALID');
    }
    if (data.target_branch_id) {
      const branch = await this.prisma.branch.findFirst({ where: { id: data.target_branch_id, organization_id: orgId, ...(data.target_company_id ? { company_id: data.target_company_id } : {}) } });
      if (!branch) throw new RepositoryError('La sucursal objetivo ERP no pertenece a la organización.', 422, 'ERP_BRANCH_SCOPE_INVALID');
    }
    const existing = await this.prisma.eRPConfig.findUnique({ where: { organization_id: orgId } });
    const rawKey = data.api_key?.trim();
    const encryptedKey = rawKey ? encryptApiKey(rawKey) : (existing?.encrypted_api_key || null);
    const isEnabled = data.is_enabled ?? existing?.is_enabled ?? false;
    const endpoint = data.api_endpoint ?? existing?.api_endpoint ?? '';
    const complete = Boolean(endpoint && encryptedKey);
    const status = data.sync_status || (isEnabled ? (complete ? 'CONECTADO' : 'CONFIGURACION_INCOMPLETA') : 'DESACTIVADO');
    const row = await this.prisma.$transaction(async tx => {
      const saved = existing
        ? await tx.eRPConfig.update({ where: { organization_id: orgId }, data: { is_enabled: isEnabled, api_endpoint: endpoint, encrypted_api_key: encryptedKey, api_key_masked: rawKey ? maskApiKey(rawKey) : existing.api_key_masked, target_company_id: data.target_company_id !== undefined ? data.target_company_id : existing.target_company_id, target_branch_id: data.target_branch_id !== undefined ? data.target_branch_id : existing.target_branch_id, auto_sync_on_approval: data.auto_sync_on_approval ?? existing.auto_sync_on_approval, ledger_account_default: data.ledger_account_default ?? existing.ledger_account_default, sync_status: status } })
        : await tx.eRPConfig.create({ data: { id: id('erp'), organization_id: orgId, is_enabled: isEnabled, api_endpoint: endpoint, encrypted_api_key: encryptedKey, api_key_masked: rawKey ? maskApiKey(rawKey) : '', target_company_id: data.target_company_id, target_branch_id: data.target_branch_id, auto_sync_on_approval: data.auto_sync_on_approval ?? false, ledger_account_default: data.ledger_account_default || '6105-01-000', sync_status: status } });
      await this.auditTx(tx, { organization_id: orgId, user_id: userId, user_name: userName, action: 'SYNC_ERP', entity_type: 'SETTINGS', entity_id: saved.id, details: `Actualizó configuración AllSender ERP. Estado: ${saved.sync_status}.` });
      return saved;
    });
    return this.toERPConfig(row);
  }

  async updateERPStatus(orgId: string, data: { sync_status?: string; last_sync_time?: string; last_test_time?: string; last_error_message?: string }): Promise<ERPConfig> {
    const existing = await this.prisma.eRPConfig.findUnique({ where: { organization_id: orgId } });
    if (!existing) throw new RepositoryError('La configuración ERP no existe.', 404, 'ERP_CONFIG_NOT_FOUND');
    const row = await this.prisma.eRPConfig.update({ where: { organization_id: orgId }, data: { sync_status: data.sync_status ?? existing.sync_status, last_sync_time: data.last_sync_time ? new Date(data.last_sync_time) : existing.last_sync_time, last_test_time: data.last_test_time ? new Date(data.last_test_time) : existing.last_test_time, last_error_message: data.last_error_message !== undefined ? data.last_error_message : existing.last_error_message } });
    return this.toERPConfig(row);
  }

  // ----------------------------------------------------
  // Expenses and immutable audit trail
  // ----------------------------------------------------
  async getExpenses(orgId: string, filters?: { company_id?: string; branch_id?: string; status?: string; classification?: string; created_by_user_id?: string }): Promise<ExpenseRecord[]> {
    const where: any = { organization_id: orgId };
    if (filters?.company_id) where.company_id = filters.company_id;
    if (filters?.branch_id) where.branch_id = filters.branch_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.classification) where.classification = filters.classification;
    if (filters?.created_by_user_id) where.created_by_user_id = filters.created_by_user_id;
    const list = await this.prisma.expense.findMany({ where, include: { line_items: true }, orderBy: { created_at: 'desc' } });
    return list.map(e => this.toExpense(e));
  }

  async getExpenseById(orgId: string, expenseId: string): Promise<ExpenseRecord | null> {
    const expense = await this.prisma.expense.findFirst({ where: { organization_id: orgId, OR: [{ id: expenseId }, { external_id: expenseId }] }, include: { line_items: true } });
    return expense ? this.toExpense(expense) : null;
  }

  async saveExpense(orgId: string, data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const existingByKey = data.idempotency_key || data.external_id
      ? await this.prisma.expense.findFirst({ where: { organization_id: orgId, OR: [
          ...(data.idempotency_key ? [{ idempotency_key: data.idempotency_key }] : []),
          ...(data.external_id ? [{ external_id: data.external_id }] : [])
        ] }, include: { line_items: true } })
      : null;
    if (existingByKey && existingByKey.id !== data.id) return this.toExpense(existingByKey);

    const existing = data.id ? await this.prisma.expense.findFirst({ where: { id: data.id, organization_id: orgId }, include: { line_items: true } }) : null;
    if (data.id && !existing) throw new RepositoryError('Erogación no encontrada.', 404, 'EXPENSE_NOT_FOUND');
    const companyId = existing?.company_id || data.company_id || (await this.prisma.company.findFirst({ where: { organization_id: orgId, is_active: true }, orderBy: { created_at: 'asc' } }))?.id;
    if (!companyId) throw new RepositoryError('La erogación requiere una empresa válida de la organización.', 422, 'EXPENSE_COMPANY_REQUIRED');
    const branchId = existing?.branch_id || data.branch_id || (await this.prisma.branch.findFirst({ where: { organization_id: orgId, company_id: companyId, is_active: true }, orderBy: { created_at: 'asc' } }))?.id;
    if (!branchId) throw new RepositoryError('La erogación requiere una sucursal válida de la organización.', 422, 'EXPENSE_BRANCH_REQUIRED');
    const creator = existing
      ? await this.prisma.user.findFirst({ where: { id: existing.created_by_user_id, organization_id: orgId } })
      : data.created_by_user_id
        ? await this.prisma.user.findFirst({ where: { id: data.created_by_user_id, organization_id: orgId, is_active: true } })
        : await this.prisma.user.findFirst({ where: { organization_id: orgId, is_active: true }, orderBy: { created_at: 'asc' } });
    if (!creator) throw new RepositoryError('La erogación requiere un usuario creador válido de la organización.', 422, 'EXPENSE_CREATOR_REQUIRED');

    const [company, branch] = await Promise.all([
      this.prisma.company.findFirst({ where: { id: companyId, organization_id: orgId } }),
      this.prisma.branch.findFirst({ where: { id: branchId, organization_id: orgId } })
    ]);
    if (!company) throw new RepositoryError('La empresa de la erogación no pertenece a la organización.', 422, 'EXPENSE_COMPANY_SCOPE_INVALID');
    if (!branch || branch.company_id !== companyId) throw new RepositoryError('La sucursal de la erogación no pertenece a la empresa.', 422, 'EXPENSE_BRANCH_SCOPE_INVALID');

    const value = (key: keyof ExpenseRecord, fallback: any) => (data[key] !== undefined ? data[key] : fallback);
    const expenseId = existing?.id || data.id || id('exp');
    const expenseData: any = {
      external_id: value('external_id', existing?.external_id || null),
      idempotency_key: value('idempotency_key', existing?.idempotency_key || null),
      organization_id: orgId,
      company_id: companyId,
      branch_id: branchId,
      created_by_user_id: creator.id,
      created_by_name: value('created_by_name', existing?.created_by_name || creator.name),
      expense_date: value('expense_date', value('date', existing?.expense_date || new Date().toISOString().split('T')[0])),
      supplier_name: value('supplier_name', existing?.supplier_name || 'Proveedor No Identificado'),
      supplier_rnc: value('supplier_rnc', existing?.supplier_rnc || ''),
      supplier_id: value('supplier_id', existing?.supplier_id || null),
      ncf: value('ncf', existing?.ncf || ''),
      ncf_type: value('ncf_type', existing?.ncf_type || 'B01'),
      document_type: value('document_type', existing?.document_type || 'FACTURA_CREDITO_FISCAL'),
      classification: value('classification', existing?.classification || 'GASTO_OPERATIVO'),
      expense_category: value('expense_category', existing?.expense_category || 'Suministros de Oficina y Papelería'),
      cost_center_id: value('cost_center_id', existing?.cost_center_id || null),
      project_id: value('project_id', existing?.project_id || null),
      vehicle_id: value('vehicle_id', existing?.vehicle_id || null),
      subtotal: Number(value('subtotal', existing?.subtotal || 0)),
      itbis_amount: Number(value('itbis_amount', existing?.itbis_amount || 0)),
      legal_tip_amount: Number(value('legal_tip_amount', existing?.legal_tip_amount || 0)),
      other_taxes: Number(value('other_taxes', existing?.other_taxes || 0)),
      total_amount: Number(value('total_amount', existing?.total_amount || 0)),
      currency: value('currency', existing?.currency || 'DOP'),
      payment_method: value('payment_method', existing?.payment_method || 'TRANSFERENCIA'),
      dgii_expense_type: value('dgii_expense_type', existing?.dgii_expense_type || null),
      dgii_payment_type: value('dgii_payment_type', existing?.dgii_payment_type || null),
      status: value('status', existing?.status || 'PENDIENTE_REVISION'),
      approval_notes: value('approval_notes', existing?.approval_notes || null),
      correction_request_note: value('correction_request_note', existing?.correction_request_note || null),
      reviewed_by: value('reviewed_by', existing?.reviewed_by || null),
      reviewed_at: value('reviewed_at', existing?.reviewed_at ? new Date(existing.reviewed_at) : null),
      receipt_image_url: value('receipt_image_url', existing?.receipt_image_url || null),
      ocr_raw_text: value('ocr_raw_text', existing?.ocr_raw_text || null),
      ai_confidence_score: Number(value('ai_confidence_score', existing?.ai_confidence_score ?? 95)),
      ai_provider_used: value('ai_provider_used', existing?.ai_provider_used || 'GEMINI'),
      ai_model_used: value('ai_model_used', existing?.ai_model_used || 'gemini-2.5-flash'),
      all_sender_sync_id: value('all_sender_sync_id', existing?.all_sender_sync_id || null),
      all_sender_synced_at: value('all_sender_synced_at', existing?.all_sender_synced_at ? new Date(existing.all_sender_synced_at) : null),
      erp_sync_status: value('erp_sync_status', existing?.erp_sync_status || 'DESACTIVADO'),
      erp_sync_error: value('erp_sync_error', existing?.erp_sync_error || null)
    };

    const saved = await this.prisma.$transaction(async tx => {
      const expense = existing
        ? await tx.expense.update({ where: { id: expenseId }, data: expenseData, include: { line_items: true } })
        : await tx.expense.create({ data: { id: expenseId, ...expenseData }, include: { line_items: true } });
      if (Array.isArray(data.line_items)) {
        await tx.expenseItem.deleteMany({ where: { expense_id: expense.id } });
        if (data.line_items.length > 0) {
          await tx.expenseItem.createMany({ data: data.line_items.map(item => ({
            expense_id: expense.id,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            itbis_rate: Number(item.itbis_rate) || 0,
            total: Number(item.total) || 0,
            sku: item.sku,
            cost_center_id: item.cost_center_id,
            project_id: item.project_id
          })) });
        }
      }
      await this.auditTx(tx, { organization_id: orgId, user_id: creator.id, user_name: creator.name, action: existing ? 'ACTUALIZAR_GASTO' : 'CREAR_GASTO', entity_type: 'EXPENSE', entity_id: expense.id, details: `${existing ? 'Actualizó' : 'Radicó'} comprobante ${expense.ncf || 'Borrador'} por RD$ ${expense.total_amount.toFixed(2)}.` });
      return tx.expense.findUniqueOrThrow({ where: { id: expense.id }, include: { line_items: true } });
    });
    return this.toExpense(saved);
  }

  async approveExpense(orgId: string, expenseId: string, reviewerName: string, notes: string): Promise<ExpenseRecord | null> {
    const existing = await this.getExpenseById(orgId, expenseId);
    if (!existing) return null;
    return this.saveExpense(orgId, { id: existing.id, status: 'APROBADO', approval_notes: notes, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() });
  }

  async rejectExpense(orgId: string, expenseId: string, reviewerName: string, reason: string): Promise<ExpenseRecord | null> {
    const existing = await this.getExpenseById(orgId, expenseId);
    if (!existing) return null;
    return this.saveExpense(orgId, { id: existing.id, status: 'RECHAZADO', correction_request_note: reason, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() });
  }

  async deleteExpense(orgId: string, expenseId: string): Promise<boolean> {
    const existing = await this.prisma.expense.findFirst({ where: { id: expenseId, organization_id: orgId } });
    if (!existing) return false;
    await this.prisma.$transaction(async tx => {
      await this.auditTx(tx, { organization_id: orgId, user_id: existing.created_by_user_id, user_name: existing.created_by_name, action: 'ACTUALIZAR_GASTO', entity_type: 'EXPENSE', entity_id: expenseId, details: `Eliminó el comprobante ${existing.ncf || expenseId}.` });
      await tx.expense.delete({ where: { id: expenseId } });
    });
    return true;
  }

  async getAuditLogs(orgId: string): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({ where: { organization_id: orgId }, orderBy: { created_at: 'desc' }, take: 500 });
    return logs.map(log => ({
      id: log.id,
      organization_id: log.organization_id,
      user_id: log.user_id,
      user_name: log.user_name,
      impersonated_by: log.impersonated_by || undefined,
      action: log.action as any,
      entity_type: log.entity_type as any,
      entity_id: log.entity_id,
      details: log.details,
      ip_address: log.ip_address || undefined,
      user_agent: log.user_agent || undefined,
      request_id: log.request_id || undefined,
      created_at: new Date(log.created_at).toISOString()
    }));
  }

  async logAudit(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organization_id: data.organization_id,
        user_id: data.user_id,
        user_name: data.user_name,
        impersonated_by: data.impersonated_by,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        details: data.details,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        request_id: data.request_id
      }
    });
  }
}

export const prismaRepo = new PrismaRepository();
