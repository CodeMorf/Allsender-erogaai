import { PrismaClient } from '@prisma/client';
import { 
  Organization, 
  Company, 
  Branch, 
  User, 
  ExpenseRecord, 
  AIProviderConfig, 
  ApiKey, 
  AuditLog, 
  ERPConfig 
} from '../../src/types.ts';
import { encryptApiKey, decryptApiKey } from '../encryption.ts';

export class PrismaRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ----------------------------------------------------
  // Organizations
  // ----------------------------------------------------
  async getOrganizations(): Promise<Organization[]> {
    const orgs = await this.prisma.organization.findMany({ where: { is_active: true } });
    return orgs.map(o => ({
      id: o.id,
      name: o.name,
      rnc: o.rnc,
      currency: o.currency as any,
      plan: o.plan as any,
      address: o.address || undefined,
      phone: o.phone || undefined,
      is_active: o.is_active,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString()
    }));
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const o = await this.prisma.organization.findUnique({ where: { id } });
    if (!o) return null;
    return {
      id: o.id,
      name: o.name,
      rnc: o.rnc,
      currency: o.currency as any,
      plan: o.plan as any,
      address: o.address || undefined,
      phone: o.phone || undefined,
      is_active: o.is_active,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString()
    };
  }

  async saveOrganization(data: Partial<Organization>): Promise<Organization> {
    const id = data.id || `org_${Date.now()}`;
    const saved = await this.prisma.organization.upsert({
      where: { id },
      update: {
        name: data.name,
        rnc: data.rnc,
        currency: data.currency,
        plan: data.plan,
        address: data.address,
        phone: data.phone,
        is_active: data.is_active
      },
      create: {
        id,
        name: data.name || 'Nueva Organización',
        rnc: data.rnc || '000000000',
        currency: data.currency || 'DOP',
        plan: data.plan || 'STARTER',
        address: data.address,
        phone: data.phone,
        is_active: data.is_active ?? true
      }
    });

    return {
      id: saved.id,
      name: saved.name,
      rnc: saved.rnc,
      currency: saved.currency as any,
      plan: saved.plan as any,
      address: saved.address || undefined,
      phone: saved.phone || undefined,
      is_active: saved.is_active,
      created_at: saved.created_at.toISOString(),
      updated_at: saved.updated_at.toISOString()
    };
  }

  // ----------------------------------------------------
  // Users & Multi-Tenant Strict Isolation
  // ----------------------------------------------------
  async getUsers(orgId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { organization_id: orgId, is_active: true }
    });
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar || undefined,
      role: u.role,
      organization_id: u.organization_id,
      department: u.department || undefined,
      status: u.status as any,
      is_active: u.is_active,
      created_at: u.created_at.toISOString()
    }));
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar || undefined,
      role: u.role,
      organization_id: u.organization_id,
      department: u.department || undefined,
      status: u.status as any,
      is_active: u.is_active,
      password_hash: u.password_hash,
      created_at: u.created_at.toISOString()
    };
  }

  // ----------------------------------------------------
  // Expenses Strict Scoping
  // ----------------------------------------------------
  async getExpenses(orgId: string, filters?: { company_id?: string; branch_id?: string; status?: string }): Promise<ExpenseRecord[]> {
    const where: any = { organization_id: orgId };
    if (filters?.company_id) where.company_id = filters.company_id;
    if (filters?.branch_id) where.branch_id = filters.branch_id;
    if (filters?.status) where.status = filters.status;

    const list = await this.prisma.expense.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    return list.map(e => ({
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
      reviewed_at: e.reviewed_at ? e.reviewed_at.toISOString() : undefined,
      receipt_image_url: e.receipt_image_url || undefined,
      ocr_raw_text: e.ocr_raw_text || undefined,
      ai_confidence_score: e.ai_confidence_score,
      ai_provider_used: e.ai_provider_used as any,
      ai_model_used: e.ai_model_used,
      line_items: [],
      created_at: e.created_at.toISOString(),
      updated_at: e.updated_at.toISOString()
    }));
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  // ----------------------------------------------------
  // Companies & Branches
  // ----------------------------------------------------
  async getCompanies(orgId: string): Promise<Company[]> {
    const list = await this.prisma.company.findMany({ where: { organization_id: orgId, is_active: true } });
    return list.map(c => ({
      id: c.id,
      organization_id: c.organization_id,
      name: c.name,
      trade_name: c.trade_name || undefined,
      rnc: c.rnc,
      tax_regime: c.tax_regime as any,
      address: c.address,
      province: c.province,
      municipality: c.municipality,
      sector: c.sector || undefined,
      phone: c.phone || undefined,
      id_type: (c.id_type || 'RNC') as any,
      timezone: c.timezone || 'America/Santo_Domingo',
      currency: c.currency as any,
      country: c.country,
      is_main: c.is_main,
      status: c.status as any,
      is_active: c.is_active,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString()
    }));
  }

  // ----------------------------------------------------
  // Audit Logs (Immutable Append-Only)
  // ----------------------------------------------------
  async logAudit(data: {
    organization_id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    impersonated_by?: string;
    ip_address?: string;
    user_agent?: string;
    request_id?: string;
  }): Promise<void> {
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
