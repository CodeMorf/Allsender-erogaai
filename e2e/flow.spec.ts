import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

test.describe('ErogaAI SaaS Multi-Tenant & Platform Security Suite', () => {
  test('unauthenticated users are redirected to login view', async ({ page }) => {
    await page.goto('/company/dashboard');
    await expect(page.locator('body')).toBeVisible();
    const hasAuthText = await page.textContent('body');
    expect(hasAuthText).toMatch(/ErogaAI|Iniciar Sesión|Registrar/i);
  });

  test('protected API routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get('/api/users');
    expect(res.status()).toBe(401);
  });

  test('platform routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get('/api/platform/tenants');
    expect(res.status()).toBe(401);
  });

  test('health endpoint is publicly accessible', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  test('tenant registration, expense creation, and authenticated report export', async ({ request }) => {
    const randomEmail = `tenant_${Date.now()}@example.com`;
    const testPassword = `E2E_${crypto.randomBytes(24).toString('hex')}`;
    const regRes = await request.post('/api/auth/register', {
      data: {
        email: randomEmail,
        password: testPassword,
        name: 'Inquilino E2E',
        company_name: 'Empresa E2E Dominicana SAS',
        rnc: '131-99882-1'
      }
    });

    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    expect(regData.user).toBeDefined();
    expect(regData.organization).toBeDefined();

    // Tenant ADMIN cannot access platform superadmin endpoints (HTTP 403)
    const platformRes = await request.get('/api/platform/tenants');
    expect(platformRes.status()).toBe(403);

    // Create an expense (HTTP 201 Created)
    const expRes = await request.post('/api/expenses', {
      data: {
        supplier_name: 'Total Energies Dominicana',
        supplier_rnc: '101-00123-4',
        ncf: 'B0100000001',
        ncf_type: 'B01',
        document_type: 'FACTURA_CREDITO_FISCAL',
        classification: 'GASTO_OPERATIVO',
        expense_category: 'Combustible',
        subtotal: 2500,
        itbis_amount: 0,
        total_amount: 2500,
        currency: 'DOP',
        payment_method: 'TARJETA_EMPRESARIAL',
        date: new Date().toISOString().split('T')[0]
      }
    });
    expect(expRes.status()).toBe(201);
    const createdExpense = await expRes.json();
    expect(createdExpense.id).toBeDefined();
    expect(createdExpense.ncf).toBe('B0100000001');

    // Verify the response came from a committed SQL row, not the process memory.
    const prisma = new PrismaClient();
    try {
      const persisted = await prisma.expense.findUnique({ where: { id: createdExpense.id } });
      expect(persisted).not.toBeNull();
      expect(persisted?.organization_id).toBe(regData.organization.id);
      expect(persisted?.ncf).toBe('B0100000001');
      expect(persisted?.total_amount).toBe(2500);
    } finally {
      await prisma.$disconnect();
    }

    // Invalid SQL relations fail closed; the API must not return HTTP 201.
    const invalidRelationRes = await request.post('/api/expenses', {
      data: {
        company_id: 'company_not_in_this_tenant',
        branch_id: 'branch_not_in_this_tenant',
        supplier_name: 'Debe fallar',
        ncf: 'B0100000002',
        subtotal: 1,
        itbis_amount: 0,
        total_amount: 1
      }
    });
    expect(invalidRelationRes.status()).toBe(422);
    expect((await invalidRelationRes.json()).code).toBe('EXPENSE_COMPANY_SCOPE_INVALID');

    // Query persisted expenses through the authenticated API.
    const listRes = await request.get('/api/expenses');
    expect(listRes.status()).toBe(200);
    const expensesList = await listRes.json();
    expect(Array.isArray(expensesList)).toBe(true);
    const found = expensesList.find((e: any) => e.ncf === 'B0100000001');
    expect(found).toBeDefined();
    expect(found.total_amount).toBe(2500);

    // Authenticated PDF export returns HTTP 200 with application/pdf
    const currentMonth = new Date().toISOString().substring(0, 7);
    const pdfRes = await request.get(`/api/reports/dgii-606/pdf?period=${currentMonth}`);
    expect(pdfRes.status()).toBe(200);
    const contentType = pdfRes.headers()['content-type'] || '';
    expect(contentType).toContain('pdf');

    // Authenticated Excel export returns HTTP 200
    const xlsxRes = await request.get(`/api/reports/dgii-606/excel?period=${currentMonth}`);
    expect(xlsxRes.status()).toBe(200);
  });

  test('password reset request and token validation', async ({ request }) => {
    const forgotRes = await request.post('/api/auth/forgot-password', {
      data: { email: 'it@codemorf.tech' }
    });
    expect(forgotRes.status()).toBe(200);

    // Invalid reset token is rejected
    const invalidReset = await request.post('/api/auth/reset-password', {
      data: {
        token: 'invalid_token_xyz',
        new_password: `Reset_${crypto.randomBytes(24).toString('hex')}`
      }
    });
    expect(invalidReset.status()).toBe(400);
  });
});
