import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { defaultRolesForOrg } from '../server/rbac.ts';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'it@codemorf.tech').trim().toLowerCase();
  const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error('SUPERADMIN_INITIAL_PASSWORD environment variable is required; no default password is allowed.');
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

  const seededUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!seededUser) throw new Error('Seed could not resolve the SuperAdmin user.');
  await prisma.membership.upsert({
    where: { id: `membership_${seededUser.id}_${org.id}` },
    update: { role: seededUser.role, status: 'ACTIVE', is_active: true },
    create: { id: `membership_${seededUser.id}_${org.id}`, organization_id: org.id, user_id: seededUser.id, role: seededUser.role, status: 'ACTIVE', is_active: true }
  });
  for (const role of defaultRolesForOrg(org.id)) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { code: role.code, name: role.name, description: role.description, color: role.color, is_system: true, permissions: JSON.stringify(role.permissions) },
      create: { id: role.id, organization_id: org.id, code: role.code, name: role.name, description: role.description, color: role.color, is_system: true, permissions: JSON.stringify(role.permissions) }
    });
  }

  // SQL is the only source of truth. The legacy data/db.json is intentionally not touched.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
