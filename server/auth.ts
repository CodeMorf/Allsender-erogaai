import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { AuthenticatedRequest } from './middleware.ts';
import { sendEmail } from './mailer.ts';

/**
 * Sets secure HttpOnly session cookie
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie('eroga_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Real Register Endpoint Handler
 */
export async function registerHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, name, company_name, rnc, country, phone, accept_terms } = req.body;

    if (!email || !password || !name || !company_name || !rnc) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    // Check unique email
    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 1. Create Organization
    const org = db.saveOrganization({
      name: company_name,
      rnc: rnc,
      currency: 'DOP',
      plan: 'PROFESSIONAL',
      phone: phone || ''
    });

    // 2. Create User
    const userResult = db.saveUser(org.id, {
      email,
      name,
      password_hash,
      role: 'ADMIN',
      department: 'Dirección General',
      status: 'ACTIVE',
      is_active: true
    }, 'system', 'Sistema de Registro');

    if (userResult.error || !userResult.user) {
      return res.status(400).json({ error: userResult.error || 'Error al crear usuario' });
    }

    const user = userResult.user;

    // 3. Create Main Company
    db.saveCompany(org.id, {
      name: company_name,
      rnc: rnc,
      id_type: 'RNC',
      tax_regime: 'REGIMEN_GENERAL',
      address: 'Santo Domingo, República Dominicana',
      province: 'Santo Domingo',
      municipality: 'Distrito Nacional',
      currency: 'DOP',
      country: country || 'Dominican Republic',
      is_main: true,
      status: 'ACTIVO',
      is_active: true
    });

    // 4. Create Session
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    const session = db.createSession(user.id, org.id, ip, userAgent);

    setSessionCookie(res, session.token);

    db.logAudit({
      organization_id: org.id,
      user_id: user.id,
      user_name: user.name,
      action: 'CREAR_USUARIO',
      entity_type: 'USER',
      entity_id: user.id,
      details: `Nuevo usuario y organización registradas ("${org.name}", RNC: ${org.rnc}).`
    });

    res.status(201).json({
      message: 'Cuenta y organización creadas exitosamente.',
      user,
      organization: org
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno durante el registro: ' + error.message });
  }
}

/**
 * Real Login Endpoint Handler
 */
export async function loginHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    const user = db.findUserByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Credenciales inválidas o cuenta desactivada.' });
    }

    // Always verify bcrypt hash — no legacy fallback allowed in production
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Cuenta sin credenciales configuradas. Contacte al administrador.' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas o contraseña incorrecta.' });
    }

    const org = db.getOrganizationById(user.organization_id);

    // Create session
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    const session = db.createSession(user.id, user.organization_id, ip, userAgent);

    setSessionCookie(res, session.token);

    db.logAudit({
      organization_id: user.organization_id,
      user_id: user.id,
      user_name: user.name,
      action: 'CREAR_USUARIO',
      entity_type: 'USER',
      entity_id: user.id,
      details: `Inicio de sesión exitoso desde ${ip}.`
    });

    res.json({
      message: 'Inicio de sesión exitoso.',
      user,
      organization: org
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno en inicio de sesión: ' + error.message });
  }
}

/**
 * Logout Handler
 */
export async function logoutHandler(req: AuthenticatedRequest, res: Response) {
  const sessionToken = req.cookies?.eroga_session || req.headers.authorization?.replace('Bearer ', '');
  if (sessionToken) {
    db.revokeSessionToken(sessionToken);
  }
  res.clearCookie('eroga_session');
  res.json({ message: 'Sesión cerrada exitosamente.' });
}

/**
 * Forgot Password Handler
 */
export async function forgotPasswordHandler(req: AuthenticatedRequest, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'El correo electrónico es requerido.' });

  const user = db.findUserByEmail(email);
  if (!user) {
    // Return generic success to prevent email enumeration
    return res.json({ message: 'Si el correo existe, recibirá instrucciones para restablecer su contraseña.' });
  }

  const resetToken = db.generatePasswordResetToken(user.id);
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Restablecer Contraseña — ErogaAI SaaS',
    html: `<p>Hola ${user.name},</p><p>Haga clic en el siguiente enlace para restablecer su contraseña de ErogaAI:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });

  res.json({ message: 'Instrucciones para restablecer contraseña enviadas a su correo.' });
}
