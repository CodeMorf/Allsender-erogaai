import crypto from 'crypto';

const RAW_SECRET = process.env.EROGAAI_SECRET_KEY || (process.env.NODE_ENV === 'production' 
  ? (() => { throw new Error('CRITICAL: EROGAAI_SECRET_KEY is mandatory in production'); })()
  : 'erogaai_dev_secret_key_32_bytes_length_required!');

function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(RAW_SECRET).digest();
}

/**
 * AES-256-GCM Authenticated Encryption for BYOK API Keys
 */
export function encryptApiKey(text: string): string {
  if (!text || text.trim() === '') return '';
  try {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const key = getDerivedKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Security] Encryption failed cleanly');
    throw new Error('Encryption operation failed');
  }
}

/**
 * Decrypts AES-256-GCM or fallback CBC payloads securely
 */
export function decryptApiKey(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return '';
  try {
    const parts = encryptedText.split(':');
    const key = getDerivedKey();

    if (parts.length === 3) {
      // GCM format: iv:tag:data
      const [ivHex, tagHex, encryptedData] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else if (parts.length === 2) {
      // Legacy CBC format fallback
      const [ivHex, encryptedData] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    return '';
  } catch (error) {
    console.error('[Security] Decryption verification failed');
    return '';
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  const prefix = apiKey.substring(0, Math.min(6, Math.floor(apiKey.length / 3)));
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}••••••••${suffix}`;
}

export function hashApiKey(rawKey: string): string {
  if (!rawKey) return '';
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

export function generateRawApiKey(): { rawKey: string; keyHash: string; maskedKey: string; prefix: string } {
  const randomSuffix = crypto.randomBytes(24).toString('hex');
  const rawKey = `eroga_live_${randomSuffix}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 14);
  const last4 = rawKey.slice(-4).toUpperCase();
  const maskedKey = `eroga_live_••••••••••••${last4}`;
  return { rawKey, keyHash, maskedKey, prefix };
}
