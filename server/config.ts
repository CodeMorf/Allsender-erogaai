import 'dotenv/config';

export function validateStartupEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const required = ['DATABASE_URL', 'EROGAAI_SECRET_KEY', 'ALLOWED_ORIGINS'];
  const missing = required.filter(name => !process.env[name]?.trim());
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('STARTUP_ENV_INVALID: producción requiere una DATABASE_URL PostgreSQL; SQLite no está permitido.');
  }
  if (process.env.REDIS_REQUIRED === 'true' && !process.env.REDIS_URL?.trim()) missing.push('REDIS_URL');
  if (missing.length > 0) throw new Error(`STARTUP_ENV_INVALID: faltan variables obligatorias: ${missing.join(', ')}`);
}

export function getTrustedProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS || (process.env.NODE_ENV === 'production' ? '1' : '0');
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) throw new Error('STARTUP_ENV_INVALID: TRUST_PROXY_HOPS debe ser un entero entre 0 y 10.');
  return hops;
}
