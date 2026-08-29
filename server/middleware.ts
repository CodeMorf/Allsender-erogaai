import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { cache } from './cache/index.ts';
import { prismaRepo } from './database/prisma.repository.ts';

export interface AuthenticatedRequest extends Request {
  user_id?: string;
  organization_id?: string;
  user_role?: string;
  platform_role?: string;
  user_name?: string;
  user_email?: string;
  request_id?: string;
}

/**
 * Attaches a unique Request ID to every incoming HTTP request for tracing & audit logs
 */
export function requestIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  req.request_id = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-ID', req.request_id);
  next();
}

/**
 * Extracts and verifies HttpOnly session cookies or Bearer API keys.
 * Injects req.organization_id and req.user_id. Never trusts frontend-supplied identity headers.
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'UNAUTHORIZED'
      });
    }

    // SQL is authoritative for every request. Redis is deliberately not used as
    // an authorization source because a stale session must not survive a revoke.
    const sessionData = await prismaRepo.validateSessionToken(sessionToken);

    if (!sessionData || !sessionData.user) {
      res.clearCookie('eroga_session');
      const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
      await cache.del(`session:${sessionHash}`);
      return res.status(401).json({
        error: 'Sesión expirada o inválida. Por favor inicie sesión nuevamente.',
        code: 'SESSION_EXPIRED'
      });
    }

    req.user_id = sessionData.user.id;
    req.organization_id = sessionData.user.organization_id;
    req.user_role = sessionData.user.role;
    req.platform_role = sessionData.user.platform_role;
    req.user_name = sessionData.user.name;
    req.user_email = sessionData.user.email;

    // Server-Side Impersonation: ONLY permitted for platform SUPER_ADMIN / PLATFORM_ADMIN
    const impersonateOrgCookie = req.cookies?.eroga_impersonate_org;
    const isPlatformSuperAdmin = sessionData.user.platform_role === 'SUPER_ADMIN' || sessionData.user.platform_role === 'PLATFORM_ADMIN';

    if (impersonateOrgCookie && isPlatformSuperAdmin) {
      const targetOrg = await prismaRepo.getOrganizationById(impersonateOrgCookie);
      if (targetOrg && targetOrg.is_active) {
        req.organization_id = targetOrg.id;
        // Mark as impersonated in request context
        (req as any).is_impersonating = true;
        (req as any).impersonated_org_name = targetOrg.name;
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Enforces Role-Based Access Control (RBAC) on backend endpoints
 */
export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.organization_id || !req.user_role) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Platform authorization is established from the SQL-backed session and
    // remains valid while a platform administrator impersonates a tenant.
    if (req.platform_role === 'SUPER_ADMIN' || req.platform_role === 'PLATFORM_ADMIN') {
      return next();
    }

    void prismaRepo.checkUserPermission(req.organization_id, req.user_id!, permissionKey)
      .then(hasAccess => {
        if (!hasAccess) {
          res.status(403).json({
            error: `Acceso denegado: Se requiere el permiso '${permissionKey}'`,
            code: 'FORBIDDEN'
          });
          return;
        }
        next();
      })
      .catch(next);
  };
}

/**
 * Validates API Request payloads against a Zod Schema
 */
export function validateSchema(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Error de validación en los datos suministrados', 
        details: result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates file upload MIME types and size limits for image OCR
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  const { image_base64, file_size_bytes, mime_type } = req.body;
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

  if (mime_type && !allowedMimes.includes(mime_type)) {
    return res.status(415).json({ error: `Formato no soportado: ${mime_type}. Use JPG, PNG, WEBP o PDF.` });
  }

  if (image_base64) {
    if (image_base64.length > 35 * 1024 * 1024) { // ~25MB decoded
      return res.status(413).json({ error: 'El archivo excede el tamaño máximo permitido de 25MB' });
    }
    if (image_base64.startsWith('data:')) {
      const detectedMime = image_base64.substring(5, image_base64.indexOf(';'));
      if (!allowedMimes.includes(detectedMime)) {
        return res.status(415).json({ error: `Formato no soportado: ${detectedMime}. Use JPG, PNG, WEBP o PDF.` });
      }
    }
  }

  next();
}
