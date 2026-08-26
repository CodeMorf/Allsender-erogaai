import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EROGAAI_SECRET_KEY || 'eroga-ai-secret-encryption-key-32-chars-2025';
const IV_LENGTH = 16;

// Derive a 32-byte key
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encryptApiKey(text: string): string {
  if (!text || text.trim() === '') return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getDerivedKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting API key:', error);
    return text;
  }
}

export function decryptApiKey(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const [ivHex, encryptedData] = encryptedText.split(':');
    if (!ivHex || !encryptedData) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedKey(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting API key:', error);
    return '';
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  const prefix = apiKey.substring(0, Math.min(4, Math.floor(apiKey.length / 4)));
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}••••••••${suffix}`;
}

export function hashApiKey(rawKey: string): string {
  if (!rawKey) return '';
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

export function generateRawApiKey(): { rawKey: string; keyHash: string; maskedKey: string } {
  const randomSuffix = crypto.randomBytes(20).toString('hex');
  const rawKey = `eroga_live_sec_${randomSuffix}`;
  const keyHash = hashApiKey(rawKey);
  const last4 = rawKey.slice(-4).toUpperCase();
  const maskedKey = `eroga_live_••••••••••••${last4}`;
  return { rawKey, keyHash, maskedKey };
}

