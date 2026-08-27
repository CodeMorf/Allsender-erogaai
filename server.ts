import express from 'express';
import 'dotenv/config';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { prismaRepo, RepositoryError } from './server/database/prisma.repository.ts';
import { 
  getAIProviderInstance, 
  extractWithFallback, 
  validateFiscalData,
  ReceiptImage
} from './server/ai-providers.ts';
import { 
  registerHandler, 
  loginHandler, 
  logoutHandler, 
  forgotPasswordHandler,
  resetPasswordHandler
} from './server/auth.ts';
import { authMiddleware, requestIdMiddleware, AuthenticatedRequest, requirePermission } from './server/middleware.ts';
import { 
  getTenantsHandler, 
  startImpersonationHandler, 
  stopImpersonationHandler, 
  platformAdminMiddleware 
} from './server/routes/platform.ts';
import { generateExpensesPDF } from './server/reports-pdf.ts';
import { generateExpensesXLSX } from './server/reports-excel.ts';
import { syncExpensesToAllSenderERP } from './server/erp-client.ts';
import { ExpenseRecord } from './src/types.ts';
import { cache } from './server/cache/index.ts';
import { getTrustedProxyHops, validateStartupEnv } from './server/config.ts';

const asyncRoute = (
  handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>
) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  void handler(req, res, next).catch(next);
};

async function startServer() {
  validateStartupEnv();
  await prismaRepo.ensureConnected();
  await cache.ensureConnected();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : (isProd ? [] : true);

  app.set('trust proxy', getTrustedProxyHops());

  // Security Headers & CORS
  app.use(helmet({
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
        connectSrc: ["'self'", "https:", "http:"]
      }
    } : false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === true) return callback(null, true);
      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  }));

  // Rate limiting for authentication and account recovery.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Por favor espere unos minutos.' }
  });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos de inicio de sesión. Espere unos minutos.' } });
  const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiadas solicitudes de recuperación. Espere unos minutos.' } });

  // Cookie Parser & JSON Body Parser
  app.use(cookieParser());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Request ID on every request for tracing
  app.use(requestIdMiddleware);

  // --------------------------------------------------
  // PUBLIC routes (no session required)
  // --------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ErogaAI SaaS Backend', time: new Date().toISOString() });
  });

  app.get('/api/ready', asyncRoute(async (_req, res) => {
    try {
      await prismaRepo.ensureConnected();
      if (process.env.REDIS_REQUIRED === 'true') await cache.ensureConnected();
      res.json({ status: 'ready', postgres: 'ok', redis: process.env.REDIS_REQUIRED === 'true' ? 'ok' : 'not_required' });
    } catch (error: any) {
      res.status(503).json({ status: 'not_ready', code: 'DEPENDENCY_UNAVAILABLE', error: error?.message || 'Dependencia no disponible.' });
    }
  }));

  // Session & Auth
  app.get('/api/session', asyncRoute(async (req, res) => {
    const token = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ organization: null, companies: [], branches: [], users: [], currentUser: null, is_impersonating: false });
    }

    const sessionData = await prismaRepo.validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      res.clearCookie('eroga_session');
      return res.json({ organization: null, companies: [], branches: [], users: [], currentUser: null, is_impersonating: false });
    }

    let orgId = sessionData.organization_id;
    let isImpersonating = false;

    // Server-Side Impersonation resolution
    const impersonateCookie = req.cookies?.eroga_impersonate_org;
    const isSuperAdmin = sessionData.user.platform_role === 'SUPER_ADMIN' || sessionData.user.platform_role === 'PLATFORM_ADMIN';
    if (impersonateCookie && isSuperAdmin) {
      const targetOrg = await prismaRepo.getOrganizationById(impersonateCookie);
      if (targetOrg && targetOrg.is_active) {
        orgId = targetOrg.id;
        isImpersonating = true;
      }
    }

    const [org, companies, branches, users] = await Promise.all([
      prismaRepo.getOrganizationById(orgId),
      prismaRepo.getCompanies(orgId),
      prismaRepo.getBranches(orgId),
      prismaRepo.getUsers(orgId)
    ]);

    res.json({
      organization: org,
      companies,
      branches,
      users,
      currentUser: sessionData.user,
      is_impersonating: isImpersonating,
      impersonated_org: isImpersonating ? org : null
    });
  }));

  app.get('/api/auth/me', asyncRoute(async (req, res) => {
    const token = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ user: null, organization: null });
    }

    const sessionData = await prismaRepo.validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      res.clearCookie('eroga_session');
      return res.json({ user: null, organization: null });
    }

    const org = await prismaRepo.getOrganizationById(sessionData.organization_id);
    res.json({
      user: sessionData.user,
      organization: org
    });
  }));

  app.post('/api/auth/register', authLimiter, registerHandler);
  app.post('/api/auth/login', loginLimiter, loginHandler);
  app.post('/api/auth/logout', logoutHandler);
  app.post('/api/auth/forgot-password', recoveryLimiter, forgotPasswordHandler);
  app.post('/api/auth/reset-password', recoveryLimiter, resetPasswordHandler);

  // --------------------------------------------------
  // PROTECTED API routes — require valid session cookie
  // All routes below this line need authMiddleware
  // --------------------------------------------------
  app.use('/api', (req, res, next) => {
    // Skip auth for: /api/health, /api/auth/*, /api/v1/* (uses API key auth), /api/session, /api/auth/me
    const pub = ['/api/health', '/api/auth/', '/api/v1/', '/api/session', '/api/auth/me'];
    if (pub.some(p => req.path.startsWith(p.replace('/api', '')))) return next();
    return authMiddleware(req as AuthenticatedRequest, res, next);
  });

  // --------------------------------------------------
  // Session & Authenticated User Info (public — no auth guard)
  // --------------------------------------------------
  app.get('/api/session', asyncRoute(async (req, res) => {
    const token = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.json({ organization: null, companies: [], branches: [], users: [], currentUser: null });
    }
    const sessionData = await prismaRepo.validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      res.clearCookie('eroga_session');
      return res.json({ organization: null, companies: [], branches: [], users: [], currentUser: null });
    }
    const orgId = sessionData.organization_id;
    res.json({
      organization: await prismaRepo.getOrganizationById(orgId),
      companies: await prismaRepo.getCompanies(orgId),
      branches: await prismaRepo.getBranches(orgId),
      users: await prismaRepo.getUsers(orgId),
      currentUser: sessionData.user
    });
  }));

  app.get('/api/auth/me', asyncRoute(async (req, res) => {
    const token = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ user: null, organization: null });
    const sessionData = await prismaRepo.validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      res.clearCookie('eroga_session');
      return res.json({ user: null, organization: null });
    }
    res.json({ user: sessionData.user, organization: await prismaRepo.getOrganizationById(sessionData.organization_id) });
  }));

  // --------------------------------------------------
  // Platform & SuperAdmin Routes (Strict SUPER_ADMIN verification)
  // --------------------------------------------------
  app.get('/api/organizations', platformAdminMiddleware, asyncRoute(async (req: AuthenticatedRequest, res) => {
    res.json({ organizations: await prismaRepo.getOrganizations() });
  }));

  app.post('/api/organizations', platformAdminMiddleware, asyncRoute(async (req: AuthenticatedRequest, res) => {
    const org = await prismaRepo.saveOrganization(req.body);
    res.status(201).json(org);
  }));

  app.get('/api/platform/tenants', platformAdminMiddleware, getTenantsHandler);
  app.post(['/api/platform/impersonation/:organizationId/start', '/api/platform/impersonation/start/:organizationId'], platformAdminMiddleware, startImpersonationHandler);
  app.post('/api/platform/impersonation/stop', platformAdminMiddleware, stopImpersonationHandler);

  // Tenant Onboarding State Persistence
  app.post('/api/organization/onboarding/complete', asyncRoute(async (req: AuthenticatedRequest, res) => {
    const orgId = req.organization_id!;
    const org = await prismaRepo.getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    const updated = await prismaRepo.saveOrganization({
      id: orgId,
      onboarding_step: 7,
      onboarding_done_at: new Date().toISOString()
    } as any);

    res.json({ success: true, organization: updated });
  }));

  // --------------------------------------------------
  // Users & Team Management (Gestión de Equipo)
  // --------------------------------------------------
  app.get('/api/users', requirePermission('team.manage_members'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const includeInactive = req.query.includeInactive === 'true';
    res.json({ users: await prismaRepo.getUsers(orgId, includeInactive) });
  }));

  app.post('/api/users', requirePermission('team.manage_members'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveUser(orgId, req.body, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ user: result.user });
  }));

  app.put('/api/users/:id', requirePermission('team.manage_members'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveUser(orgId, { ...req.body, id: req.params.id }, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ user: result.user });
  }));

  app.delete('/api/users/:id', requirePermission('team.manage_members'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.deactivateUser(orgId, req.params.id, userId, userName);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result);
  }));

  // --------------------------------------------------
  // RBAC Roles & Permissions Matrix Management
  // --------------------------------------------------
  app.get('/api/rbac/permissions', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    res.json({ permissions: await prismaRepo.getPermissionsCatalog() });
  }));

  app.get('/api/rbac/roles', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ roles: await prismaRepo.getRoles(orgId), permissions: await prismaRepo.getPermissionsCatalog() });
  }));

  app.post('/api/rbac/roles', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveRole(orgId, req.body, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ role: result.role, message: `Rol "${result.role?.name}" creado exitosamente.` });
  }));

  app.put('/api/rbac/roles/:id', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveRole(orgId, { ...req.body, id: req.params.id }, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ role: result.role, message: `Rol "${result.role?.name}" actualizado exitosamente.` });
  }));

  app.delete('/api/rbac/roles/:id', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.deleteRole(orgId, req.params.id, userId, userName);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json(result);
  }));

  app.put('/api/rbac/matrix', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Formato inválido. Se esperaba un array de actualizaciones de roles.' });
    }

    const result = await prismaRepo.updateRbacMatrix(orgId, updates, userId, userName);
    res.json(result);
  }));

  app.post('/api/rbac/matrix/reset', requirePermission('team.manage_roles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.resetRbacMatrix(orgId, userId, userName);
    res.json(result);
  }));

  // --------------------------------------------------
  // Companies & Branches Management (Mi Empresa & Sedes)
  // --------------------------------------------------
  app.get('/api/companies', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const includeInactive = req.query.includeInactive === 'true';
    res.json({ companies: await prismaRepo.getCompanies(orgId, includeInactive) });
  }));

  app.post('/api/companies', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;
    
    const result = await prismaRepo.saveCompany(orgId, req.body, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ company: result.company });
  }));

  app.put('/api/companies/:id', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveCompany(orgId, { ...req.body, id: req.params.id }, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ company: result.company });
  }));

  app.delete('/api/companies/:id', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.deactivateCompany(orgId, req.params.id, userId, userName);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result);
  }));

  // Branches
  app.get('/api/branches', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const companyId = req.query.company_id as string;
    const includeInactive = req.query.includeInactive === 'true';
    res.json({ branches: await prismaRepo.getBranches(orgId, companyId, includeInactive) });
  }));

  app.post('/api/branches', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveBranch(orgId, req.body, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ branch: result.branch });
  }));

  app.put('/api/branches/:id', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.saveBranch(orgId, { ...req.body, id: req.params.id }, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ branch: result.branch });
  }));

  app.delete('/api/branches/:id', requirePermission('company.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.deactivateBranch(orgId, req.params.id, userId, userName);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result);
  }));

  // --------------------------------------------------
  // API Keys Management (Configuración → API Keys)
  // --------------------------------------------------
  app.get('/api/api-keys/scopes', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    res.json({ scopes: await prismaRepo.getApiKeyScopes() });
  }));

  app.get('/api/api-keys', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ api_keys: await prismaRepo.getApiKeys(orgId) });
  }));

  app.post('/api/api-keys', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.createApiKey(orgId, req.body, userId, userName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({
      apiKey: result.apiKey,
      rawKey: result.rawKey,
      warning: 'Guarda esta clave en un lugar seguro. Por motivos de seguridad, no volverá a mostrarse completa.'
    });
  }));

  app.post('/api/api-keys/:id/regenerate', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.regenerateApiKey(orgId, req.params.id, userId, userName);
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    res.json({
      apiKey: result.apiKey,
      rawKey: result.rawKey,
      warning: 'Nueva clave generada. La anterior ha sido revocada automáticamente.'
    });
  }));

  app.patch('/api/api-keys/:id/status', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;
    const { is_active } = req.body;
    const result = await prismaRepo.updateApiKeyStatus(orgId, req.params.id, Boolean(is_active), userId, userName);
    if (!result.success) return res.status(404).json({ error: 'API Key no encontrada' });
    res.json(result);
  }));

  app.delete('/api/api-keys/:id', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const userName = (req as AuthenticatedRequest).user_name!;

    const result = await prismaRepo.revokeApiKey(orgId, req.params.id, userId, userName);
    if (!result.success) return res.status(404).json({ error: result.message });
    res.json(result);
  }));

  app.get('/api/api-keys/logs', requirePermission('apikeys.manage'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ logs: await prismaRepo.getApiKeyLogs(orgId) });
  }));

  // --------------------------------------------------
  // Categories & Cost Centers
  // --------------------------------------------------
  app.get('/api/categories', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ categories: await prismaRepo.getCategories(orgId) });
  }));

  app.post('/api/categories', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveCategory(orgId, req.body);
    res.status(201).json({ category: saved });
  }));

  app.delete('/api/categories/:id', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteCategory(orgId, req.params.id);
    if (!success) return res.status(400).json({ error: 'No se puede eliminar una categoría del sistema o no existe' });
    res.json({ success: true });
  }));

  app.get('/api/cost-centers', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ costCenters: await prismaRepo.getCostCenters(orgId) });
  }));

  app.post('/api/cost-centers', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveCostCenter(orgId, req.body);
    res.status(201).json({ costCenter: saved });
  }));

  app.delete('/api/cost-centers/:id', requirePermission('master.cost_centers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteCostCenter(orgId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Cost center not found' });
    res.json({ success: true });
  }));

  // Suppliers
  app.get('/api/suppliers', requirePermission('master.suppliers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ suppliers: await prismaRepo.getSuppliers(orgId) });
  }));

  app.post('/api/suppliers', requirePermission('master.suppliers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveSupplier(orgId, req.body);
    res.status(201).json({ supplier: saved });
  }));

  app.delete('/api/suppliers/:id', requirePermission('master.suppliers'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteSupplier(orgId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true });
  }));

  // Projects
  app.get('/api/projects', requirePermission('master.projects'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ projects: await prismaRepo.getProjects(orgId) });
  }));

  app.post('/api/projects', requirePermission('master.projects'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveProject(orgId, req.body);
    res.status(201).json({ project: saved });
  }));

  app.delete('/api/projects/:id', requirePermission('master.projects'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteProject(orgId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  }));

  // Vehicles
  app.get('/api/vehicles', requirePermission('master.vehicles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ vehicles: await prismaRepo.getVehicles(orgId) });
  }));

  app.post('/api/vehicles', requirePermission('master.vehicles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveVehicle(orgId, req.body);
    res.status(201).json({ vehicle: saved });
  }));

  app.delete('/api/vehicles/:id', requirePermission('master.vehicles'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteVehicle(orgId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ success: true });
  }));

  // Audit Logs
  app.get('/api/audit-logs', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ logs: await prismaRepo.getAuditLogs(orgId) });
  }));

  // ERP Config
  app.get('/api/erp/config', requirePermission('erp.configure'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json({ config: await prismaRepo.getERPConfig(orgId) });
  }));

  app.post('/api/erp/config', requirePermission('erp.configure'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveERPConfig(orgId, req.body, (req as AuthenticatedRequest).user_id!, (req as AuthenticatedRequest).user_name!);
    res.json({ config: saved });
  }));

  // Expenses (Erogaciones)
  app.get('/api/expenses', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const canViewAll = await prismaRepo.checkUserPermission(orgId, userId, 'expenses.view_all');
    const filters = {
      status: req.query.status as string,
      classification: req.query.classification as string,
      company_id: req.query.company_id as string,
      branch_id: req.query.branch_id as string,
      created_by_user_id: canViewAll ? undefined : userId
    };
    const expenses = await prismaRepo.getExpenses(orgId, filters);
    res.json(expenses);
  }));

  app.get('/api/expenses/:id', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const userId = (req as AuthenticatedRequest).user_id!;
    const expense = await prismaRepo.getExpenseById(orgId, req.params.id);
    const canViewAll = await prismaRepo.checkUserPermission(orgId, userId, 'expenses.view_all');
    if (!expense || (!canViewAll && expense.created_by_user_id !== userId)) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json(expense);
  }));

  app.post('/api/expenses', requirePermission('expenses.create_manual'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const saved = await prismaRepo.saveExpense(orgId, {
      ...req.body,
      organization_id: orgId,
      created_by_user_id: (req as AuthenticatedRequest).user_id,
      created_by_name: (req as AuthenticatedRequest).user_name
    });
    res.status(201).json(saved);
  }));

  app.put('/api/expenses/:id', requirePermission('expenses.edit'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const updated = await prismaRepo.saveExpense(orgId, { ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.patch('/api/expenses/:id/status', requirePermission('approvals.approve_reject'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const { status, notes, reviewer_name, correction_note } = req.body;
    
    const updated = await prismaRepo.saveExpense(orgId, {
      id: req.params.id,
      status,
      approval_notes: notes,
      correction_request_note: correction_note,
      reviewed_by: reviewer_name,
      reviewed_at: new Date().toISOString()
    });

    res.json(updated);
  }));

  app.delete('/api/expenses/:id', requirePermission('expenses.delete'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const success = await prismaRepo.deleteExpense(orgId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Expense not found' });
    res.json({ success: true, message: 'Comprobante eliminado con éxito.' });
  }));

  // Batch status update
  app.post('/api/expenses/batch-status', requirePermission('approvals.approve_reject'), asyncRoute(async (req: AuthenticatedRequest, res) => {
    const orgId = req.organization_id!;
    const { expenseIds, status, reviewerName, notes } = req.body;
    if (!Array.isArray(expenseIds)) {
      return res.status(400).json({ error: 'expenseIds array is required' });
    }

    const results = await Promise.all(expenseIds.map((id: string) => {
      return prismaRepo.saveExpense(orgId, {
        id,
        status,
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
        approval_notes: notes
      });
    }));

    res.json({ updatedCount: results.length, expenses: results });
  }));

  // --------------------------------------------------
  // AI OCR & Extraction Routes
  // --------------------------------------------------
  const handleOCRExtraction = async (req: express.Request, res: express.Response) => {
    let receiptId: string | undefined;
    try {
      const { 
        image_base64, 
        image_url,
        mime_type = 'image/jpeg', 
        provider_type
      } = req.body;

      // Always use session-verified org — never trust body-supplied organization_id
      const orgId = (req as AuthenticatedRequest).organization_id!;

      const imgPayload = image_base64 || image_url;
      if (!imgPayload) {
        return res.status(400).json({ error: 'Se requiere image_base64 o image_url para procesar el comprobante' });
      }

      const receiptImage: ReceiptImage = {
        base64Data: imgPayload,
        mimeType: mime_type
      };

      const storedReceipt = await prismaRepo.saveReceipt(orgId, {
        image_base64: image_base64,
        image_url,
        mime_type,
        status: 'PROCESSING'
      });
      receiptId = storedReceipt.id;

      const result = await extractWithFallback(orgId, receiptImage);
      const validation = validateFiscalData({
        supplier_name: result.extraction.supplier_name,
        supplier_rnc: result.extraction.supplier_rnc,
        ncf: result.extraction.ncf,
        subtotal: result.extraction.subtotal,
        itbis_amount: result.extraction.itbis_amount,
        total_amount: result.extraction.total_amount
      });

      await prismaRepo.saveReceipt(orgId, {
        id: storedReceipt.id,
        status: 'PROCESSED',
        extraction: result.extraction,
        fiscal_validation: validation,
        meta: { provider_used: result.providerUsed, model_used: result.modelUsed, confidence_score: result.extraction.confidence_score }
      });

      return res.json({
        success: true,
        receipt_id: storedReceipt.id,
        extraction: result.extraction,
        validation,
        provider_used: result.providerUsed,
        model_used: result.modelUsed
      });
    } catch (error: any) {
      if (receiptId) {
        try {
          await prismaRepo.saveReceipt((req as AuthenticatedRequest).organization_id!, { id: receiptId, status: 'FAILED', error: error.message || 'Error processing receipt with AI' });
        } catch (persistError: any) {
          console.error('[ErogaAI] OCR_FAILURE_STATE_PERSISTENCE_FAILED:', persistError?.message || persistError);
        }
      }
      console.error('Scan receipt error:', error);
      res.status(500).json({ error: error.message || 'Error processing receipt with AI' });
    }
  };

  app.post('/api/ai/ocr-extract', requirePermission('expenses.create_ocr'), handleOCRExtraction);
  app.post('/api/ai/scan-receipt', requirePermission('expenses.create_ocr'), handleOCRExtraction);

  // AI Providers Configuration Routes
  app.get('/api/ai/providers', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    res.json(await prismaRepo.getAIProviderConfigs(orgId));
  }));

  app.post('/api/ai/providers', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const { apiKey, api_key, ...config } = req.body;
    const keyToSave = apiKey || api_key;
    const saved = await prismaRepo.saveAIProvider(orgId, { ...config, api_key: keyToSave });
    res.json(saved);
  }));

  app.post('/api/ai/providers/:id/test', asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const config = await prismaRepo.getAIProviderById(orgId, req.params.id);
    if (!config) return res.status(404).json({ error: 'Provider configuration not found' });

    try {
      const startTime = Date.now();
      const provider = await getAIProviderInstance(orgId, config.provider_type);
      const testRes = await provider.testConnection();
      const latencyMs = testRes.latency_ms || (Date.now() - startTime);
      const status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNTESTED' = testRes.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
      const msg = testRes.message;

      const updated = await prismaRepo.saveAIProvider(orgId, {
        id: config.id,
        provider_type: config.provider_type,
        status,
        last_test_message: msg,
        last_used_at: new Date().toISOString()
      });

      res.json({ success: status === 'ONLINE', status, message: msg, latency_ms: latencyMs, provider: updated });
    } catch (error: any) {
      const msg = `Fallo de conexión con ${config.name}: ${error.message}`;
      const updated = await prismaRepo.saveAIProvider(orgId, {
        id: config.id,
        provider_type: config.provider_type,
        status: 'OFFLINE',
        last_test_message: msg,
        last_used_at: new Date().toISOString()
      });
      res.status(502).json({ success: false, status: 'OFFLINE', message: msg, provider: updated });
    }
  }));

  // --------------------------------------------------
  // DGII 606 & AllSender ERP Sync Routes
  // --------------------------------------------------
  app.get('/api/reports/dgii-606', requirePermission('fiscal.export_606'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const companyId = req.query.company_id as string;
    const rawPeriod = (req.query.period as string || '').replace(/[^0-9]/g, '');
    
    let expenses = (await prismaRepo.getExpenses(orgId)).filter(e => e.status === 'APROBADO' || e.status === 'SINCRONIZADO_ERP');
    if (companyId) {
      expenses = expenses.filter(e => e.company_id === companyId);
    }

    if (rawPeriod.length >= 6) {
      const yearMonth = `${rawPeriod.substring(0, 4)}-${rawPeriod.substring(4, 6)}`;
      expenses = expenses.filter(e => (e.expense_date || e.date || '').startsWith(yearMonth));
    }

    const reportPeriod = rawPeriod.length >= 6 
      ? rawPeriod.substring(0, 6) 
      : new Date().toISOString().substring(0, 7).replace('-', '');

    const records606 = expenses.map(e => {
      const isCedula = (e.supplier_rnc || '').replace(/\D/g, '').length === 11;
      const isServicio = e.classification === 'GASTO_OPERATIVO' && !e.expense_category.toLowerCase().includes('suministro');

      return {
        id: e.id,
        rnc_cedula: (e.supplier_rnc || '').replace(/[^0-9]/g, ''),
        tipo_id: isCedula ? '2' : '1',
        tipo_bienes_servicios: isServicio ? '02 - Gastos por Trabajos, Suministros y Servicios' : '01 - Gastos de Personal / Insumos',
        ncf: e.ncf,
        ncf_modificado: '',
        fecha_comprobante: (e.date || '').replace(/-/g, ''),
        fecha_pago: (e.date || '').replace(/-/g, ''),
        monto_servicios: isServicio ? e.subtotal : 0,
        monto_bienes: isServicio ? 0 : e.subtotal,
        total_monto_facturado: e.total_amount,
        itbis_facturado: e.itbis_amount,
        itbis_retenido: 0,
        itbis_proporcionalidad: 0,
        itbis_costo: 0,
        itbis_adelantar: e.itbis_amount,
        itbis_percibido: 0,
        retencion_renta: 0,
        tipo_retencion_isr: '00',
        forma_pago: e.payment_method === 'TARJETA_EMPRESARIAL' ? '02 - Tarjeta de Crédito/Débito' : '04 - Transferencia'
      };
    });

    res.json({
      periodo: reportPeriod,
      total_records: records606.length,
      total_amount: records606.reduce((a, b) => a + b.total_monto_facturado, 0),
      total_itbis: records606.reduce((a, b) => a + b.itbis_facturado, 0),
      records: records606
    });
  }));

  // DGII 606 PDF Export Route
  app.get(['/api/reports/dgii-606/pdf', '/api/reports/expenses/pdf'], requirePermission('fiscal.export_606'), asyncRoute(async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).organization_id!;
      const org = await prismaRepo.getOrganizationById(orgId);
      if (!org) return res.status(404).json({ error: 'Organización no encontrada' });
      
      const companyId = req.query.company_id as string;
      const company = companyId ? await prismaRepo.getCompanyById(orgId, companyId) : undefined;
      const branchId = req.query.branch_id as string;
      const branch = branchId ? await prismaRepo.getBranchById(orgId, branchId) : undefined;
      
      const expenses = await prismaRepo.getExpenses(orgId, { company_id: companyId, branch_id: branchId });
      const pdfBuffer = await generateExpensesPDF({
        organization: org,
        company,
        branch,
        title: 'Reporte de Erogaciones & Comprobantes Fiscales DGII',
        subtitle: `Período Fiscal: ${new Date().toISOString().substring(0, 7)}`,
        expenses,
        generatedBy: (req as AuthenticatedRequest).user_name
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ErogaAI_Reporte_${org.rnc}_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Error generando PDF: ' + err.message });
    }
  }));

  // DGII 606 Excel (.xlsx) Export Route
  app.get(['/api/reports/dgii-606/excel', '/api/reports/dgii-606/xlsx', '/api/reports/expenses/excel'], requirePermission('fiscal.export_606'), asyncRoute(async (req, res) => {
    try {
      const orgId = (req as AuthenticatedRequest).organization_id!;
      const org = await prismaRepo.getOrganizationById(orgId);
      if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

      const companyId = req.query.company_id as string;
      const company = companyId ? await prismaRepo.getCompanyById(orgId, companyId) : undefined;
      const expenses = await prismaRepo.getExpenses(orgId, { company_id: companyId });

      const xlsxBuffer = await generateExpensesXLSX({
        organization: org,
        company,
        period: new Date().toISOString().substring(0, 7),
        expenses,
        generatedBy: (req as AuthenticatedRequest).user_name
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ErogaAI_DGII_606_${org.rnc}_${Date.now()}.xlsx"`);
      res.send(xlsxBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Error generando Excel: ' + err.message });
    }
  }));

  // AllSender ERP Sync API
  app.post('/api/all-sender/sync', requirePermission('erp.sync_expenses'), asyncRoute(async (req, res) => {
    const orgId = (req as AuthenticatedRequest).organization_id!;
    const expenseIds = req.body.expenseIds || req.body.expense_ids;
    const config = await prismaRepo.getERPConfig(orgId, true);

    if (!config || !config.is_enabled) {
      return res.status(400).json({
        success: false,
        error: 'ERP_DISABLED: El conector AllSender ERP no está habilitado para esta organización.',
        synced_count: 0
      });
    }

    let targetExpenses = await prismaRepo.getExpenses(orgId);
    if (Array.isArray(expenseIds) && expenseIds.length > 0) {
      targetExpenses = targetExpenses.filter(e => expenseIds.includes(e.id));
    } else {
      targetExpenses = targetExpenses.filter(e => e.status === 'APROBADO');
    }

    const syncResult = await syncExpensesToAllSenderERP(orgId, config, targetExpenses);
    
    // Save updated synced records back into DB
    for (const exp of syncResult.synced_expenses) {
      await prismaRepo.saveExpense(orgId, exp);
    }
    await prismaRepo.updateERPStatus(orgId, {
      sync_status: syncResult.success ? 'CONECTADO' : 'ERROR',
      last_sync_time: new Date().toISOString(),
      last_error_message: syncResult.errors.length > 0 ? syncResult.errors.join('; ').slice(0, 1000) : ''
    });

    res.json({
      success: syncResult.success,
      synced_count: syncResult.synced_count,
      failed_count: syncResult.failed_count,
      errors: syncResult.errors,
      erp_endpoint: config.api_endpoint || 'https://api.allsender.app/v1/erogaciones/import-batch',
      message: syncResult.success
        ? `${syncResult.synced_count} comprobantes sincronizados exitosamente con AllSender ERP.`
        : `Sincronización finalizada con ${syncResult.failed_count} incidencias.`
    });
  }));

  // --------------------------------------------------
  // EXTERNAL GENERIC REST API (v1) - Authorized via API Key
  // Agnostic, universal microservice interface for external ERPs, CRMs, and systems
  // --------------------------------------------------
  const apiKeyAuthMiddleware = (requiredScope?: string) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const startTime = Date.now();
      const authHeader = (req.headers['authorization'] || req.headers['x-api-key'] || '') as string;
      let validation;
      try {
        validation = await prismaRepo.validateRawApiKey(authHeader, requiredScope);
      } catch (error) {
        return next(error);
      }

      if (!validation.valid || !validation.apiKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: validation.error || 'Credenciales de API Key inválidas o insuficientes.',
          code: 'AUTH_API_KEY_INVALID'
        });
      }

      // Attach API key context to request
      (req as any).apiKey = validation.apiKey;
      (req as any).organization_id = validation.apiKey.organization_id;
      (req as any).company_id = validation.apiKey.company_id;

      // Log successful request upon finish
      res.on('finish', () => {
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
        void prismaRepo.logApiRequest({
          api_key_id: validation.apiKey!.id,
          organization_id: validation.apiKey!.organization_id,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          status_code: res.statusCode,
          ip_address: clientIp.toString(),
          latency_ms: Date.now() - startTime
        }).catch(error => console.error('[ErogaAI] API_KEY_LOG_PERSISTENCE_FAILED:', error?.message || error));
      });

      next();
    };
  };

  // OpenAPI Specification endpoint
  app.get(['/docs/openapi.yaml', '/api/v1/openapi.yaml'], (req, res) => {
    res.sendFile(path.join(process.cwd(), 'docs', 'openapi.yaml'));
  });

  // 1. Health & Ping
  app.get('/api/v1/health', apiKeyAuthMiddleware(), (req, res) => {
    const key = (req as any).apiKey;
    res.json({
      status: 'ok',
      service: 'ErogaAI Generic API v1',
      authenticated_key: key.name,
      masked_key: key.masked_key,
      organization_id: key.organization_id,
      company_id: key.company_id,
      scopes: key.scopes,
      timestamp: new Date().toISOString()
    });
  });

  // 2. Catalogs: Companies, Branches, Suppliers, Categories, Cost Centers
  app.get('/api/v1/companies', apiKeyAuthMiddleware('companies:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    res.json({
      success: true,
      data: await prismaRepo.getCompanies(orgId)
    });
  }));

  app.get('/api/v1/branches', apiKeyAuthMiddleware('companies:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const companyId = req.query.company_id as string;
    res.json({
      success: true,
      data: await prismaRepo.getBranches(orgId, companyId)
    });
  }));

  app.get('/api/v1/suppliers', apiKeyAuthMiddleware('suppliers:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    res.json({
      success: true,
      data: await prismaRepo.getSuppliers(orgId)
    });
  }));

  app.get('/api/v1/categories', apiKeyAuthMiddleware('expenses:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    res.json({
      success: true,
      data: await prismaRepo.getCategories(orgId)
    });
  }));

  app.get('/api/v1/cost-centers', apiKeyAuthMiddleware('expenses:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    res.json({
      success: true,
      data: await prismaRepo.getCostCenters(orgId)
    });
  }));

  // 3. Receipts Lifecycle (Upload -> Process OCR -> Query)
  app.post('/api/v1/receipts/upload', apiKeyAuthMiddleware('ocr:process'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const { image_base64, image_url, file_name, mime_type } = req.body;
    const imgData = image_base64 || image_url;

    if (!imgData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Debe suministrar image_base64 o image_url del comprobante fiscal.'
      });
    }

    const receipt = await prismaRepo.saveReceipt(orgId, {
      image_base64: image_base64,
      image_url: image_url,
      file_name: file_name || 'comprobante.jpg',
      mime_type: mime_type || 'image/jpeg',
      status: 'UPLOADED'
    });

    res.status(201).json({
      success: true,
      receipt_id: receipt.id,
      status: receipt.status,
      created_at: receipt.created_at,
      message: 'Comprobante cargado exitosamente. Puede proceder a procesarlo con IA.'
    });
  }));

  app.get('/api/v1/receipts/:id', apiKeyAuthMiddleware('ocr:process'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const receipt = await prismaRepo.getReceiptById(orgId, req.params.id);

    if (!receipt) {
      return res.status(404).json({ error: 'Not Found', message: 'Comprobante no encontrado.' });
    }

    res.json({
      success: true,
      data: receipt
    });
  }));

  app.post('/api/v1/receipts/:id/process', apiKeyAuthMiddleware('ocr:process'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const receipt = await prismaRepo.getReceiptById(orgId, req.params.id);

    if (!receipt) {
      return res.status(404).json({ error: 'Not Found', message: 'Comprobante no encontrado.' });
    }

    const imgPayload = receipt.image_base64 || receipt.image_url;
    if (!imgPayload) {
      return res.status(400).json({ error: 'Bad Request', message: 'El comprobante no tiene imagen válida asociada.' });
    }

    try {
      const processingReceipt = await prismaRepo.saveReceipt(orgId, { id: receipt.id, status: 'PROCESSING' });
      const receiptImage: ReceiptImage = {
        base64Data: processingReceipt.image_base64 || processingReceipt.image_url || imgPayload,
        mimeType: processingReceipt.mime_type || 'image/jpeg'
      };

      const result = await extractWithFallback(orgId, receiptImage);
      const validation = validateFiscalData(result.extraction);

      const updated = await prismaRepo.saveReceipt(orgId, {
        id: receipt.id,
        status: 'PROCESSED',
        extraction: result.extraction,
        fiscal_validation: validation,
        meta: {
          provider_used: result.providerUsed,
          model_used: result.modelUsed,
          confidence_score: result.extraction.confidence_score
        }
      });

      await prismaRepo.triggerWebhooks(orgId, 'receipt.processed', updated);

      res.json({
        success: true,
        receipt_id: updated.id,
        status: updated.status,
        extraction: updated.extraction,
        fiscal_validation: updated.fiscal_validation,
        meta: updated.meta
      });
    } catch (err: any) {
      try {
        await prismaRepo.saveReceipt(orgId, { id: receipt.id, status: 'FAILED', error: err.message });
      } catch (persistError: any) {
        console.error('[ErogaAI] RECEIPT_FAILURE_STATE_PERSISTENCE_FAILED:', persistError?.message || persistError);
      }
      res.status(500).json({ error: 'OCR Processing Error', message: err.message });
    }
  }));

  // Direct OCR Scan endpoint for single-step API integrations
  app.post('/api/v1/ocr/scan', apiKeyAuthMiddleware('ocr:process'), async (req, res) => {
    try {
      const orgId = (req as any).organization_id;
      const { image_base64, image_url, mime_type = 'image/jpeg' } = req.body;
      const imgPayload = image_base64 || image_url;

      if (!imgPayload) {
        return res.status(400).json({ error: 'Bad Request', message: 'Campo image_base64 o image_url requerido en el payload.' });
      }

      const receiptImage: ReceiptImage = {
        base64Data: imgPayload,
        mimeType: mime_type
      };

      const result = await extractWithFallback(orgId, receiptImage);
      const validation = validateFiscalData(result.extraction);

      res.json({
        success: true,
        data: result.extraction,
        fiscal_validation: validation,
        meta: {
          provider_used: result.providerUsed,
          model_used: result.modelUsed,
          confidence_score: result.extraction.confidence_score
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'OCR Processing Error', message: err.message });
    }
  });

  // 4. Expenses Management (CRUD, Approve, Reject)
  app.get('/api/v1/expenses', apiKeyAuthMiddleware('expenses:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const apiKey = (req as any).apiKey;
    const requestedCompanyId = req.query.company_id as string;
    const requestedBranchId = req.query.branch_id as string;
    if (requestedCompanyId && requestedCompanyId !== apiKey.company_id) {
      return res.status(403).json({ error: 'La API Key no tiene acceso a la empresa solicitada.', code: 'API_KEY_SCOPE_INVALID' });
    }
    if (requestedBranchId && apiKey.branch_id && requestedBranchId !== apiKey.branch_id) {
      return res.status(403).json({ error: 'La API Key no tiene acceso a la sucursal solicitada.', code: 'API_KEY_SCOPE_INVALID' });
    }
    const companyId = apiKey.company_id;
    const branchId = apiKey.branch_id || requestedBranchId;
    const status = req.query.status as string;

    const expenses = await prismaRepo.getExpenses(orgId, { company_id: companyId, branch_id: branchId, status });
    res.json({
      success: true,
      total: expenses.length,
      data: expenses
    });
  }));

  app.get('/api/v1/expenses/:id', apiKeyAuthMiddleware('expenses:read'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const apiKey = (req as any).apiKey;
    const expense = await prismaRepo.getExpenseById(orgId, req.params.id);

    if (!expense || expense.company_id !== apiKey.company_id || (apiKey.branch_id && expense.branch_id !== apiKey.branch_id)) {
      return res.status(404).json({ error: 'Not Found', message: 'Erogación no encontrada.' });
    }

    res.json({
      success: true,
      data: expense
    });
  }));

  app.post('/api/v1/expenses', apiKeyAuthMiddleware('expenses:write'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const defaultCompanyId = (req as any).company_id;
    const idempotencyKey = (req.headers['idempotency-key'] || req.body.idempotency_key) as string;

    const body = req.body || {};

    // Support both nested structure and flat structure
    let supplierName = body.supplier_name || body.supplier?.name || 'Proveedor General';
    let supplierRnc = body.supplier_rnc || body.supplier?.rnc || '';
    let ncf = body.ncf || body.document?.ncf || '';
    let ncfType = body.ncf_type || body.document?.type || 'B01';
    let date = body.date || body.document?.date || new Date().toISOString().split('T')[0];
    
    let subtotal = Number(body.subtotal ?? (body.amounts ? (body.amounts.subtotal_goods || 0) + (body.amounts.subtotal_services || 0) : 0));
    let itbis = Number(body.itbis_amount ?? (body.amounts?.itbis || 0));
    let legalTip = Number(body.legal_tip_amount ?? (body.amounts?.legal_tip || 0));
    let otherTaxes = Number(body.other_taxes ?? (body.amounts?.other_taxes || 0));
    let total = Number(body.total_amount ?? (body.amounts?.total || (subtotal + itbis + legalTip + otherTaxes)));
    let currency = body.currency || body.amounts?.currency || 'DOP';

    let classification = body.classification?.nature || body.classification || 'GASTO_OPERATIVO';
    let category = body.expense_category || body.classification?.category || 'Suministros de Oficina y Papelería';
    let dgiiCode = body.dgii_expense_type || (body.classification?.dgii_code ? `${body.classification.dgii_code} - Gastos Generales` : '02 - Gastos por Trabajos, Suministros y Servicios');

    const expensePayload: Partial<ExpenseRecord> = {
      ...body,
      idempotency_key: idempotencyKey,
      external_id: body.external_id,
      company_id: body.company_id || defaultCompanyId,
      branch_id: body.branch_id,
      supplier_name: supplierName,
      supplier_rnc: supplierRnc,
      ncf: ncf,
      ncf_type: ncfType,
      date: date,
      subtotal: subtotal,
      itbis_amount: itbis,
      legal_tip_amount: legalTip,
      other_taxes: otherTaxes,
      total_amount: total,
      currency: currency,
      classification: classification,
      expense_category: category,
      dgii_expense_type: dgiiCode,
      payment_method: body.payment_method || 'TARJETA_EMPRESARIAL',
      status: body.status || 'PENDIENTE_REVISION'
    };

    const saved = await prismaRepo.saveExpense(orgId, {
      ...expensePayload,
      created_by_user_id: (req as any).apiKey?.created_by,
      created_by_name: (req as any).apiKey?.name
    });

    res.status(201).json({
      success: true,
      message: 'Erogación radicada exitosamente.',
      data: saved
    });
  }));

  app.patch('/api/v1/expenses/:id', apiKeyAuthMiddleware('expenses:write'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const existing = await prismaRepo.getExpenseById(orgId, req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Erogación no encontrada.' });
    }

    const updated = await prismaRepo.saveExpense(orgId, {
      ...req.body,
      id: existing.id
    });

    res.json({
      success: true,
      message: 'Erogación actualizada exitosamente.',
      data: updated
    });
  }));

  app.delete('/api/v1/expenses/:id', apiKeyAuthMiddleware('expenses:write'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const existing = await prismaRepo.getExpenseById(orgId, req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Erogación no encontrada.' });
    }

    await prismaRepo.deleteExpense(orgId, existing.id);
    res.json({
      success: true,
      message: 'Erogación eliminada exitosamente.'
    });
  }));

  app.post('/api/v1/expenses/:id/approve', apiKeyAuthMiddleware('expenses:write'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const { reviewer_name, notes } = req.body || {};

    const approved = await prismaRepo.approveExpense(orgId, req.params.id, reviewer_name || 'API Integration', notes || 'Aprobado vía API v1');
    if (!approved) {
      return res.status(404).json({ error: 'Not Found', message: 'Erogación no encontrada.' });
    }

    res.json({
      success: true,
      message: 'Erogación aprobada exitosamente.',
      data: approved
    });
  }));

  app.post('/api/v1/expenses/:id/reject', apiKeyAuthMiddleware('expenses:write'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const { reviewer_name, reason } = req.body || {};

    const rejected = await prismaRepo.rejectExpense(orgId, req.params.id, reviewer_name || 'API Integration', reason || 'Rechazado vía API v1');
    if (!rejected) {
      return res.status(404).json({ error: 'Not Found', message: 'Erogación no encontrada.' });
    }

    res.json({
      success: true,
      message: 'Erogación rechazada.',
      data: rejected
    });
  }));

  // 5. Reports: DGII 606
  app.get('/api/v1/reports/dgii-606', apiKeyAuthMiddleware('dgii:export'), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const companyId = (req.query.company_id as string) || (req as any).company_id;

    const expenses = (await prismaRepo.getExpenses(orgId, { company_id: companyId }))
      .filter(e => e.status === 'APROBADO' || e.status === 'SINCRONIZADO_ERP');

    const records606 = expenses.map(e => {
      const isCedula = (e.supplier_rnc || '').replace(/\D/g, '').length === 11;
      const isServicio = e.classification === 'GASTO_OPERATIVO' && !e.expense_category.toLowerCase().includes('suministro');

      return {
        rnc_cedula: (e.supplier_rnc || '').replace(/[^0-9]/g, ''),
        tipo_id: isCedula ? '2' : '1',
        tipo_bienes_servicios: isServicio ? '02' : '01',
        ncf: e.ncf,
        fecha_comprobante: (e.date || '').replace(/-/g, ''),
        fecha_pago: (e.date || '').replace(/-/g, ''),
        monto_servicios: isServicio ? e.subtotal : 0,
        monto_bienes: isServicio ? 0 : e.subtotal,
        total_monto_facturado: e.total_amount,
        itbis_facturado: e.itbis_amount,
        itbis_retenido: 0,
        itbis_proporcionalidad: 0,
        itbis_costo: 0,
        itbis_adelantar: e.itbis_amount,
        itbis_percibido: 0,
        retencion_renta: 0,
        tipo_retencion_isr: '00',
        forma_pago: e.payment_method === 'TARJETA_EMPRESARIAL' ? '02' : '04'
      };
    });

    res.json({
      success: true,
      periodo: new Date().toISOString().substring(0, 7).replace('-', ''),
      company_id: companyId,
      total_records: records606.length,
      total_amount: records606.reduce((a, b) => a + b.total_monto_facturado, 0),
      total_itbis: records606.reduce((a, b) => a + b.itbis_facturado, 0),
      data: records606
    });
  }));

  // 6. AI Providers & Telemetry
  app.get('/api/v1/ai/providers', apiKeyAuthMiddleware(), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const providers = await prismaRepo.getAIProviderConfigs(orgId);
    res.json({
      success: true,
      data: providers.map(p => ({
        id: p.id,
        name: p.name,
        provider_type: p.provider_type,
        selected_model: p.selected_model,
        status: p.status,
        is_primary: p.is_primary,
        total_requests: p.total_requests
      }))
    });
  }));

  app.get('/api/v1/ai/usage', apiKeyAuthMiddleware(), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const logs = await prismaRepo.getAIUsageLogs(orgId);
    res.json({
      success: true,
      total_operations: logs.length,
      total_tokens_consumed: logs.reduce((a, b) => a + b.tokens_prompt + b.tokens_completion, 0),
      recent_logs: logs.slice(0, 20)
    });
  }));

  // 7. Webhooks Management
  app.get('/api/v1/webhooks', apiKeyAuthMiddleware(), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    res.json({
      success: true,
      data: await prismaRepo.getWebhooks(orgId)
    });
  }));

  app.post('/api/v1/webhooks', apiKeyAuthMiddleware(), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const { url, events, secret } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Bad Request', message: 'URL del webhook requerida.' });
    }

    const webhook = await prismaRepo.saveWebhook(orgId, { url, events, secret });
    res.status(201).json({
      success: true,
      message: 'Webhook registrado exitosamente.',
      data: webhook
    });
  }));

  app.delete('/api/v1/webhooks/:id', apiKeyAuthMiddleware(), asyncRoute(async (req, res) => {
    const orgId = (req as any).organization_id;
    const deleted = await prismaRepo.deleteWebhook(orgId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Webhook no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Webhook eliminado.'
    });
  }));

  // All async SQL handlers reach this boundary. A failed transaction is never
  // converted into a successful HTTP response.
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const statusCode = error instanceof RepositoryError ? error.statusCode : 500;
    const code = error instanceof RepositoryError ? error.code : 'INTERNAL_ERROR';
    console.error(`[ErogaAI] ${code}:`, error?.message || error);
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Error interno del servidor.' : (error.message || 'La operación no pudo completarse.'),
      code
    });
  });

  // --------------------------------------------------
  // Vite Integration for Dev / Static Serving for Prod
  // --------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ErogaAI SaaS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[ErogaAI] Server startup failed:', error?.message || error);
  process.exitCode = 1;
});
