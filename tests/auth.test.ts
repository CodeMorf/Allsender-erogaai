import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prismaRepo } from '../server/database/prisma.repository.ts';

describe('Auth & Security Validation', () => {
  it('hashes passwords securely with bcrypt', async () => {
    const rawPass = `Test_${crypto.randomBytes(24).toString('hex')}`;
    const hashed = await bcrypt.hash(rawPass, 10);
    expect(hashed).not.toEqual(rawPass);

    const isMatch = await bcrypt.compare(rawPass, hashed);
    expect(isMatch).toBe(true);
  });

  it('creates and validates SQL-backed session tokens', async () => {
    const org = await prismaRepo.saveOrganization({ name: `Test Org ${Date.now()}`, rnc: '101-00000-1' });
    const userResult = await prismaRepo.saveUser(org.id, {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: await bcrypt.hash(`Session_${crypto.randomBytes(24).toString('hex')}`, 10)
    });

    expect(userResult.user).toBeDefined();

    const session = await prismaRepo.createSession(userResult.user!.id, org.id, '127.0.0.1', 'Vitest');
    expect(session.token).toBeDefined();
    expect(session.token.startsWith('eroga_sess_')).toBe(true);

    const validated = await prismaRepo.validateSessionToken(session.token);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe(userResult.user!.id);
    expect(validated?.organization_id).toBe(org.id);
  });
});
