import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware.ts';
import { prismaRepo } from '../database/prisma.repository.ts';

/**
 * Ensures user possesses Platform Role (SUPER_ADMIN or PLATFORM_ADMIN)
 * Strictest security check — organization role ADMIN is NEVER permitted platform access.
 */
export async function platformAdminMiddleware(req: AuthenticatedRequest, res: Response, next: any) {
  try {
    const user = req.user_id ? await prismaRepo.getUserById(req.user_id) : null;
    if (!user || (user.platform_role !== 'SUPER_ADMIN' && user.platform_role !== 'PLATFORM_ADMIN')) {
      return res.status(403).json({
        error: 'Acceso denegado: Se requieren permisos exclusivos de SuperAdmin de Plataforma',
        code: 'PLATFORM_FORBIDDEN'
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * List all tenants (Organizations)
 */
export async function getTenantsHandler(req: AuthenticatedRequest, res: Response) {
  const orgs = await prismaRepo.getOrganizations();
  const tenants = await Promise.all(orgs.map(async org => {
    const [companies, users, expenses] = await Promise.all([
      prismaRepo.getCompanies(org.id),
      prismaRepo.getUsers(org.id),
      prismaRepo.getExpenses(org.id)
    ]);
    return {
      ...org,
      companies_count: companies.length,
      users_count: users.length,
      expenses_count: expenses.length,
      total_spent: expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.total_amount : 0), 0)
    };
  }));
  res.json({ tenants });
}

/**
 * Impersonate Tenant Organization — Server-Side Cookie Session
 */
export async function startImpersonationHandler(req: AuthenticatedRequest, res: Response) {
  const { organizationId } = req.params;
  const targetOrg = await prismaRepo.getOrganizationById(organizationId);

  if (!targetOrg) {
    return res.status(404).json({ error: 'Organización inquilina no encontrada' });
  }

  // Set secure HttpOnly impersonation cookie verified by server
  res.cookie('eroga_impersonate_org', targetOrg.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000 // 4 hours max impersonation window
  });

  await prismaRepo.logAudit({
    organization_id: targetOrg.id,
    user_id: req.user_id || 'usr_superadmin',
    user_name: req.user_name || 'SuperAdmin',
    impersonated_by: req.user_id,
    action: 'IMPERSONATE_ORGANIZATION',
    entity_type: 'ORGANIZATION',
    entity_id: targetOrg.id,
    details: `SuperAdmin (${req.user_email}) inició impersonación de servidor en "${targetOrg.name}" (RNC: ${targetOrg.rnc}).`
  });

  res.json({
    success: true,
    message: `Impersonación iniciada para ${targetOrg.name}`,
    organization: targetOrg
  });
}

/**
 * Stop Impersonation — Clear Server-Side Cookie
 */
export async function stopImpersonationHandler(req: AuthenticatedRequest, res: Response) {
  res.clearCookie('eroga_impersonate_org');
  res.json({ success: true, message: 'Impersonación finalizada exitosamente.' });
}

