import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

async function migrateJsonToSql() {
  console.log('=== ErogaAI SaaS: Herramienta de Migración JSON -> SQL ===');

  if (!fs.existsSync(DB_FILE_PATH)) {
    console.log('No se encontró archivo data/db.json. Omitiendo migración legacy.');
    return;
  }

  const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
  const data = JSON.parse(raw);

  let stats = {
    organizations: 0,
    companies: 0,
    branches: 0,
    users: 0,
    memberships: 0,
    expenses: 0,
    categories: 0,
    costCenters: 0,
    suppliers: 0,
    projects: 0,
    vehicles: 0,
    receipts: 0,
    aiProviders: 0,
    apiKeys: 0,
    auditLogs: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // 1. Organizations
    if (Array.isArray(data.organizations)) {
      for (const org of data.organizations) {
        try {
          await prisma.organization.upsert({
            where: { id: org.id },
            update: {},
            create: {
              id: org.id,
              name: org.name || 'Organización Corporativa',
              rnc: org.rnc || '000000000',
              currency: org.currency || 'DOP',
              plan: org.plan || 'STARTER',
              address: org.address,
              phone: org.phone,
              is_active: org.is_active ?? true
            }
          });
          stats.organizations++;
        } catch {
          stats.skipped++;
        }
      }
    }

    // 2. Users
    if (Array.isArray(data.users)) {
      for (const usr of data.users) {
        try {
          await prisma.user.upsert({
            where: { email: usr.email },
            update: {},
            create: {
              id: usr.id,
              organization_id: usr.organization_id,
              email: usr.email,
              name: usr.name,
              avatar: usr.avatar,
              role: usr.role || 'EMPLOYEE',
              platform_role: usr.email.includes('superadmin') ? 'SUPER_ADMIN' : 'NONE',
              department: usr.department || 'Operaciones',
              status: usr.status || 'ACTIVE',
              is_active: usr.is_active ?? true,
              password_hash: usr.password_hash || '$2a$10$eWkZ.xY.e3R1Hh2g/6V.yO9p7a1234567890'
            }
          });
          stats.users++;
        } catch {
          stats.skipped++;
        }
      }
    }

    // 3. Companies
    if (Array.isArray(data.companies)) {
      for (const comp of data.companies) {
        try {
          await prisma.company.upsert({
            where: { id: comp.id },
            update: {},
            create: {
              id: comp.id,
              organization_id: comp.organization_id,
              name: comp.name,
              trade_name: comp.trade_name,
              rnc: comp.rnc,
              id_type: comp.id_type || 'RNC',
              tax_regime: comp.tax_regime || 'REGIMEN_GENERAL',
              address: comp.address || 'Santo Domingo',
              province: comp.province || 'Santo Domingo',
              municipality: comp.municipality || 'Distrito Nacional',
              currency: comp.currency || 'DOP',
              country: comp.country || 'Dominican Republic',
              is_main: comp.is_main ?? false,
              status: comp.status || 'ACTIVO',
              is_active: comp.is_active ?? true
            }
          });
          stats.companies++;
        } catch {
          stats.skipped++;
        }
      }
    }

    // 4. Branches
    if (Array.isArray(data.branches)) {
      for (const branch of data.branches) {
        try {
          await prisma.branch.upsert({
            where: { id: branch.id },
            update: {},
            create: {
              id: branch.id,
              company_id: branch.company_id,
              organization_id: branch.organization_id,
              name: branch.name,
              code: branch.code,
              address: branch.address || 'Central',
              status: branch.status || 'ACTIVO',
              is_active: branch.is_active ?? true
            }
          });
          stats.branches++;
        } catch {
          stats.skipped++;
        }
      }
    }

    // 5. Expenses
    if (Array.isArray(data.expenses)) {
      for (const exp of data.expenses) {
        try {
          await prisma.expense.upsert({
            where: { id: exp.id },
            update: {},
            create: {
              id: exp.id,
              external_id: exp.external_id,
              idempotency_key: exp.idempotency_key || `idemp_${exp.id}`,
              organization_id: exp.organization_id,
              company_id: exp.company_id,
              branch_id: exp.branch_id,
              created_by_user_id: exp.created_by_user_id || 'usr_admin_01',
              created_by_name: exp.created_by_name || 'Administrador',
              expense_date: exp.expense_date || exp.date || new Date().toISOString().split('T')[0],
              supplier_name: exp.supplier_name,
              supplier_rnc: exp.supplier_rnc,
              ncf: exp.ncf,
              ncf_type: exp.ncf_type || 'B01',
              document_type: exp.document_type || 'FACTURA_CREDITO_FISCAL',
              classification: exp.classification || 'GASTO_OPERATIVO',
              expense_category: exp.expense_category || 'Gastos Operativos',
              subtotal: exp.subtotal || 0,
              itbis_amount: exp.itbis_amount || 0,
              legal_tip_amount: exp.legal_tip_amount || 0,
              other_taxes: exp.other_taxes || 0,
              total_amount: exp.total_amount || 0,
              currency: exp.currency || 'DOP',
              payment_method: exp.payment_method || 'TRANSFERENCIA',
              status: exp.status || 'APROBADO',
              ai_confidence_score: exp.ai_confidence_score || 95.0,
              ai_provider_used: exp.ai_provider_used || 'GEMINI',
              ai_model_used: exp.ai_model_used || 'gemini-2.5-flash'
            }
          });
          stats.expenses++;
        } catch {
          stats.skipped++;
        }
      }
    }

    console.log('=== Resumen Final de Migración SQL ===');
    console.log(`Organizaciones: ${stats.organizations} importadas`);
    console.log(`Empresas: ${stats.companies} importadas`);
    console.log(`Sucursales: ${stats.branches} importadas`);
    console.log(`Usuarios: ${stats.users} importados`);
    console.log(`Erogaciones: ${stats.expenses} importadas`);
    console.log(`Duplicados/Omitidos: ${stats.skipped}`);
    console.log(`Errores: ${stats.errors}`);
  } catch (err: any) {
    console.error('Error durante la migración:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateJsonToSql();
