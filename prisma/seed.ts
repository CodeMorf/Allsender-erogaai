import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isProd = process.env.NODE_ENV === 'production';
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'it@codemorf.tech').trim().toLowerCase();
  let initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;

  if (isProd && !initialPassword) {
    throw new Error('FATAL: SUPERADMIN_INITIAL_PASSWORD environment variable is strictly required in production.');
  }

  if (!initialPassword) {
    initialPassword = '12345678';
  }

  // 1. Ensure Default Enterprise Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org_allsender_corp' },
    update: {},
    create: {
      id: 'org_allsender_corp',
      name: 'Organización Corporativa AllSender',
      rnc: '131-89241-2',
      currency: 'DOP',
      plan: 'ENTERPRISE',
      address: 'Av. Winston Churchill #1099, Torre Citi, Piantini, Santo Domingo, D.N.',
      phone: '+1 (809) 567-8900',
      is_active: true
    }
  });

  // 2. Check if Super Admin exists before hashing
  const existingUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  let passwordHash = existingUser?.password_hash;

  if (!existingUser) {
    passwordHash = await bcrypt.hash(initialPassword, 10);
    await prisma.user.create({
      data: {
        id: `usr_superadmin_${Date.now()}`,
        organization_id: org.id,
        name: 'Super Administrador de Plataforma',
        email: superAdminEmail,
        password_hash: passwordHash,
        role: 'ADMIN',
        platform_role: 'SUPER_ADMIN',
        department: 'Tecnología & Plataforma',
        status: 'ACTIVE',
        is_active: true
      }
    });
    console.log(`[Seed] Created new SuperAdmin: ${superAdminEmail}`);
  } else {
    await prisma.user.update({
      where: { email: superAdminEmail },
      data: {
        platform_role: 'SUPER_ADMIN',
        role: 'ADMIN',
        is_active: true
      }
    });
    console.log(`[Seed] SuperAdmin ${superAdminEmail} already exists. Preserved existing password hash.`);
  }

  // 3. Sync to data/db.json if it exists
  const dbJsonPath = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
      const idx = data.users.findIndex((u: any) => u.email.toLowerCase() === superAdminEmail);
      const userPayload = {
        id: idx >= 0 ? data.users[idx].id : `usr_superadmin_${Date.now()}`,
        organization_id: org.id,
        name: idx >= 0 ? data.users[idx].name : 'Super Administrador de Plataforma',
        email: superAdminEmail,
        role: 'ADMIN',
        platform_role: 'SUPER_ADMIN',
        department: 'Tecnología & Plataforma',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        is_active: true,
        password_hash: idx >= 0 ? data.users[idx].password_hash : passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (idx >= 0) {
        data.users[idx] = { ...data.users[idx], ...userPayload, password_hash: data.users[idx].password_hash };
      } else {
        data.users.push(userPayload);
      }
      fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Seed] Synced SuperAdmin ${superAdminEmail} with data/db.json`);
    } catch (e: any) {
      console.warn('[Seed] Warning syncing with db.json:', e.message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
