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
  AuditLog
} from '../../src/types.ts';

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
      erp_sync_error: e.erp_sync_error || undefined
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
  // Expenses and immutable audit trail
  // ----------------------------------------------------
  async getExpenses(orgId: string, filters?: { company_id?: string; branch_id?: string; status?: string; classification?: string }): Promise<ExpenseRecord[]> {
    const where: any = { organization_id: orgId };
    if (filters?.company_id) where.company_id = filters.company_id;
    if (filters?.branch_id) where.branch_id = filters.branch_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.classification) where.classification = filters.classification;
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
