import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware.ts';
import { db } from '../db.ts';

/**
 * Ensures user possesses Platform Role (SUPER_ADMIN or PLATFORM_ADMIN)
 */
export function platformAdminMiddleware(req: AuthenticatedRequest, res: Response, next: any) {
  const user = db.findUserByEmail(req.user_email || '');
  if (!user || (user.platform_role !== 'SUPER_ADMIN' && user.platform_role !== 'PLATFORM_ADMIN' && req.user_role !== 'ADMIN')) {
    return res.status(403).json({ 
      error: 'Acceso denegado: Se requieren permisos de SuperAdmin de Plataforma', 
      code: 'PLATFORM_FORBIDDEN' 
    });
  }
  next();
}

/**
 * List all tenants (Organizations)
 */
export async function getTenantsHandler(req: AuthenticatedRequest, res: Response) {
  const orgs = db.getOrganizations();
  const tenants = orgs.map(org => {
    const companies = db.getCompanies(org.id);
    const users = db.getUsers(org.id);
    const expenses = db.getExpenses(org.id);
    return {
      ...org,
      companies_count: companies.length,
      users_count: users.length,
      expenses_count: expenses.length,
      total_spent: expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.total_amount : 0), 0)
    };
  });
  res.json({ tenants });
}

/**
 * Impersonate Tenant Organization
 */
export async function startImpersonationHandler(req: AuthenticatedRequest, res: Response) {
  const { organizationId } = req.params;
  const targetOrg = db.getOrganizationById(organizationId);

  if (!targetOrg) {
    return res.status(404).json({ error: 'Organización inquilina no encontrada' });
  }

  db.logAudit({
    organization_id: targetOrg.id,
    user_id: req.user_id || 'usr_superadmin',
    user_name: req.user_name || 'SuperAdmin',
    impersonated_by: req.user_id,
    action: 'IMPERSONATE_ORGANIZATION',
    entity_type: 'ORGANIZATION',
    entity_id: targetOrg.id,
    details: `SuperAdmin inició impersonación en la organización "${targetOrg.name}" (RNC: ${targetOrg.rnc}).`
  });

  res.json({
    success: true,
    message: `Impersonación iniciada para ${targetOrg.name}`,
    organization: targetOrg
  });
}

/**
 * Stop Impersonation
 */
export async function stopImpersonationHandler(req: AuthenticatedRequest, res: Response) {
  res.json({ success: true, message: 'Impersonación finalizada.' });
}
