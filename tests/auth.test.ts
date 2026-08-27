import { describe, it, expect } from 'vitest';
import { db } from '../server/db.ts';
import bcrypt from 'bcryptjs';

describe('Auth & Security Validation', () => {
  it('hashes passwords securely with bcrypt', async () => {
    const rawPass = 'Secret123!';
    const hashed = await bcrypt.hash(rawPass, 10);
    expect(hashed).not.toEqual(rawPass);

    const isMatch = await bcrypt.compare(rawPass, hashed);
    expect(isMatch).toBe(true);
  });

  it('creates and validates session tokens', () => {
    const org = db.saveOrganization({ name: 'Test Org', rnc: '101-00000-1' });
    const userResult = db.saveUser(org.id, {
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    expect(userResult.user).toBeDefined();

    const session = db.createSession(userResult.user!.id, org.id, '127.0.0.1', 'Vitest');
    expect(session.token).toBeDefined();
    expect(session.token.startsWith('eroga_sess_')).toBe(true);

    const validated = db.validateSessionToken(session.token);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe(userResult.user!.id);
    expect(validated?.organization_id).toBe(org.id);
  });
});
