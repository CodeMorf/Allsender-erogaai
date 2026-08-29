import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { prismaRepo } from '../server/database/prisma.repository.ts';

const randomSecret = (prefix: string) => `${prefix}_${crypto.randomBytes(24).toString('hex')}`;

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`El servidor de reinicio no inició dentro de ${timeoutMs}ms.`);
}

test('production hardening: SQL isolation, state persistence and fail-closed authorization', async () => {
  test.setTimeout(120000);
  const prisma = new PrismaClient();
  const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const tenantAContext = await playwrightRequest.newContext({ baseURL: baseUrl });
  const tenantBContext = await playwrightRequest.newContext({ baseURL: baseUrl });
  const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
  const platformContext = await playwrightRequest.newContext({ baseURL: baseUrl });
  const employeeContext = await playwrightRequest.newContext({ baseURL: baseUrl });

  try {
    const readyResponse = await tenantAContext.get('/api/ready');
    expect(readyResponse.status()).toBe(200);
    const readyData = await readyResponse.json();
    expect(readyData.postgres).toBe('ok');
    if (process.env.REDIS_REQUIRED === 'true') expect(readyData.redis).toBe('ok');

    const tenantAPassword = randomSecret('TenantA');
    const tenantAEmail = `${randomSecret('tenant_a').toLowerCase()}@example.com`;
    const tenantARegistration = await tenantAContext.post('/api/auth/register', {
      data: { email: tenantAEmail, password: tenantAPassword, name: 'Tenant A', company_name: 'Empresa A', rnc: '131-00001-1' }
    });
    expect(tenantARegistration.status()).toBe(201);
    const tenantA = await tenantARegistration.json();
    const companyA = await prisma.company.findFirst({ where: { organization_id: tenantA.organization.id, is_main: true } });
    expect(companyA).not.toBeNull();

    const tenantBPassword = randomSecret('TenantB');
    const tenantBEmail = `${randomSecret('tenant_b').toLowerCase()}@example.com`;
    const tenantBRegistration = await tenantBContext.post('/api/auth/register', {
      data: { email: tenantBEmail, password: tenantBPassword, name: 'Tenant B', company_name: 'Empresa B', rnc: '131-00002-9' }
    });
    expect(tenantBRegistration.status()).toBe(201);
    const tenantB = await tenantBRegistration.json();

    // Multi-segment receipts are persisted in SQL and every route is tenant-scoped.
    const receiptSessionResponse = await tenantAContext.post('/api/receipt-sessions');
    expect(receiptSessionResponse.status()).toBe(201);
    const receiptSession = (await receiptSessionResponse.json()).data;
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const firstSegmentResponse = await tenantAContext.post(`/api/receipt-sessions/${receiptSession.id}/segments`, {
      data: { image_base64: tinyPng, file_name: 'tramo-1.png', mime_type: 'image/png', organization_id: tenantB.organization.id }
    });
    expect(firstSegmentResponse.status()).toBe(201);
    const firstSegmentSession = (await firstSegmentResponse.json()).data;
    expect(firstSegmentSession.segments).toHaveLength(1);
    const firstSegmentId = firstSegmentSession.segments[0].id;
    expect((await tenantAContext.post(`/api/receipt-sessions/${receiptSession.id}/segments`, { data: { image_base64: tinyPng, file_name: 'tramo-2.png', mime_type: 'image/png' } })).status()).toBe(201);
    for (let index = 3; index <= 20; index += 1) {
      expect((await tenantAContext.post(`/api/receipt-sessions/${receiptSession.id}/segments`, { data: { image_base64: tinyPng, file_name: `tramo-${index}.png`, mime_type: 'image/png' } })).status()).toBe(201);
    }
    const overLimitSegment = await tenantAContext.post(`/api/receipt-sessions/${receiptSession.id}/segments`, { data: { image_base64: tinyPng, file_name: 'tramo-21.png', mime_type: 'image/png' } });
    expect(overLimitSegment.status()).toBe(422);
    expect((await overLimitSegment.json()).code).toBe('RECEIPT_SEGMENT_LIMIT');
    expect((await prisma.receiptSession.findUnique({ where: { id: receiptSession.id } }))?.organization_id).toBe(tenantA.organization.id);
    expect(await prisma.receiptSegment.count({ where: { receipt_session_id: receiptSession.id, organization_id: tenantA.organization.id } })).toBe(20);
    expect((await tenantBContext.get(`/api/receipt-sessions/${receiptSession.id}`)).status()).toBe(404);
    expect((await tenantBContext.delete(`/api/receipt-sessions/${receiptSession.id}/segments/${firstSegmentId}`)).status()).toBe(404);
    const prematureApproval = await tenantAContext.post('/api/expenses', {
      data: { receipt_session_id: receiptSession.id, supplier_name: 'No aprobar', supplier_rnc: '101001577', ncf: 'B0100000199', subtotal: 1, itbis_amount: 0, total_amount: 1, status: 'APROBADO', date: new Date().toISOString().slice(0, 10) }
    });
    expect(prematureApproval.status()).toBe(422);
    expect((await prematureApproval.json()).code).toBe('EXPENSE_RECEIPT_REVIEW_REQUIRED');

    // The same normalized RNC is valid in separate tenants, but not twice in one tenant.
    const tenantSupplierA = await prisma.supplier.create({ data: { id: `supplier_a_${crypto.randomBytes(5).toString('hex')}`, organization_id: tenantA.organization.id, rnc: '101-00157-7', rnc_normalized: '101001577', name: 'Proveedor Fiscal A', status_dgii: 'ACTIVO' } });
    await expect(prisma.supplier.create({ data: { id: `supplier_a_dup_${crypto.randomBytes(5).toString('hex')}`, organization_id: tenantA.organization.id, rnc: '101001577', rnc_normalized: '101001577', name: 'Duplicado', status_dgii: 'ACTIVO' } })).rejects.toMatchObject({ code: 'P2002' });
    const tenantSupplierB = await prisma.supplier.create({ data: { id: `supplier_b_${crypto.randomBytes(5).toString('hex')}`, organization_id: tenantB.organization.id, rnc: '101001577', rnc_normalized: '101001577', name: 'Proveedor Fiscal B', status_dgii: 'ACTIVO' } });
    expect(tenantSupplierA.organization_id).not.toBe(tenantSupplierB.organization_id);

    // Approval always revalidates the final edited payload against a processed SQL session.
    const approvalSessionResponse = await tenantAContext.post('/api/receipt-sessions');
    expect(approvalSessionResponse.status()).toBe(201);
    const approvalSession = (await approvalSessionResponse.json()).data;
    await prisma.receiptSession.update({
      where: { id: approvalSession.id },
      data: {
        status: 'PROCESSED',
        supplier_id: tenantSupplierA.id,
        extraction_json: JSON.stringify({ supplier_name: tenantSupplierA.name, supplier_rnc: '101001577', ncf: 'B0100000103', ncf_type: 'B01', subtotal: 1000, itbis_amount: 180, legal_tip_amount: 0, other_taxes: 0, total_amount: 1180, line_items: [] }),
        fiscal_validation_json: JSON.stringify({ is_valid: true, rnc_valid: true, ncf_valid: true, math_valid: true, warnings: [], errors: [] }),
        reconciliation_json: JSON.stringify({ is_valid: true, expected_total: 1180, calculated_total: 1180, difference: 0, tolerance: 0.02, line_items_total: 1000, discounts: 0, probable_segment_indexes: [] })
      }
    });
    const editedApproval = await tenantAContext.post('/api/expenses', {
      data: { receipt_session_id: approvalSession.id, supplier_id: tenantSupplierA.id, supplier_name: tenantSupplierA.name, supplier_rnc: '101001577', ncf: 'B0100000103', ncf_type: 'B01', subtotal: 1000, itbis_amount: 180, total_amount: 1500, status: 'APROBADO', date: new Date().toISOString().slice(0, 10) }
    });
    expect(editedApproval.status()).toBe(422);
    expect((await editedApproval.json()).code).toBe('EXPENSE_FISCAL_REVALIDATION_REQUIRED');

    const validApprovalSessionResponse = await tenantAContext.post('/api/receipt-sessions');
    expect(validApprovalSessionResponse.status()).toBe(201);
    const validApprovalSession = (await validApprovalSessionResponse.json()).data;
    await prisma.receiptSession.update({ where: { id: validApprovalSession.id }, data: { status: 'PROCESSED', supplier_id: tenantSupplierA.id } });
    const validApproval = await tenantAContext.post('/api/expenses', {
      data: { receipt_session_id: validApprovalSession.id, supplier_id: tenantSupplierA.id, supplier_name: tenantSupplierA.name, supplier_rnc: '101001577', ncf: 'B0100000104', ncf_type: 'B01', subtotal: 1000, itbis_amount: 180, total_amount: 1180, status: 'APROBADO', date: new Date().toISOString().slice(0, 10) }
    });
    expect(validApproval.status()).toBe(201);
    const savedApprovalSession = await prisma.receiptSession.findUnique({ where: { id: validApprovalSession.id } });
    expect(savedApprovalSession?.status).toBe('SAVED');
    expect(JSON.parse(savedApprovalSession?.fiscal_validation_json || '{}').is_valid).toBe(true);

    const expenseResponse = await tenantAContext.post('/api/expenses', {
      data: { supplier_name: 'Proveedor A', supplier_rnc: '101-00000-1', ncf: 'B0100000101', subtotal: 100, itbis_amount: 18, total_amount: 118, date: new Date().toISOString().slice(0, 10) }
    });
    expect(expenseResponse.status()).toBe(201);
    const expenseA = await expenseResponse.json();

    // Cross-tenant reads and writes are scoped by the authenticated session.
    const tenantBList = await tenantBContext.get('/api/expenses');
    expect(tenantBList.status()).toBe(200);
    expect((await tenantBList.json()).some((expense: any) => expense.id === expenseA.id)).toBe(false);
    expect((await tenantBContext.get(`/api/expenses/${expenseA.id}`)).status()).toBe(404);
    expect((await tenantBContext.put(`/api/expenses/${expenseA.id}`, { data: { total_amount: 999 } })).status()).toBe(404);

    // RBAC is read from SQL: an employee is denied, then the SQL matrix is changed and access is granted.
    const employeePassword = randomSecret('Employee');
    const employeeEmail = `${randomSecret('employee').toLowerCase()}@example.com`;
    const employeeId = `e2e_employee_${crypto.randomBytes(8).toString('hex')}`;
    const employeeHash = await bcrypt.hash(employeePassword, 12);
    await prisma.user.create({ data: { id: employeeId, organization_id: tenantA.organization.id, email: employeeEmail, name: 'Empleado SQL', role: 'EMPLOYEE', platform_role: 'NONE', password_hash: employeeHash, status: 'ACTIVE', is_active: true } });
    await prisma.membership.create({ data: { id: `membership_${employeeId}`, organization_id: tenantA.organization.id, user_id: employeeId, role: 'EMPLOYEE', status: 'ACTIVE', is_active: true } });
    const employeeLogin = await employeeContext.post('/api/auth/login', { data: { email: employeeEmail, password: employeePassword } });
    expect(employeeLogin.status()).toBe(200);
    expect((await employeeContext.get('/api/users')).status()).toBe(403);
    await prisma.role.update({ where: { id: `${tenantA.organization.id}::EMPLOYEE` }, data: { permissions: JSON.stringify(['team.manage_members']) } });
    expect((await employeeContext.get('/api/users')).status()).toBe(200);

    // All API key lifecycle operations and scopes are SQL-backed.
    const apiKeyCreation = await tenantAContext.post('/api/api-keys', {
      data: { name: 'E2E SQL API', company_id: companyA!.id, scopes: ['expenses:read', 'ocr:process', 'companies:read', 'suppliers:read', 'dgii:export'] }
    });
    expect(apiKeyCreation.status()).toBe(201);
    const apiKeyData = await apiKeyCreation.json();
    expect(apiKeyData.rawKey).toBeTruthy();
    expect(apiKeyData.apiKey.key_hash).toBe('');
    const rawApiKey = apiKeyData.rawKey;
    const storedApiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyData.apiKey.id } });
    expect(storedApiKey).not.toBeNull();
    expect(storedApiKey?.key_hash).not.toBe(rawApiKey);
    expect(storedApiKey?.organization_id).toBe(tenantA.organization.id);

    const apiHealth = await apiContext.get('/api/v1/health', { headers: { Authorization: `Bearer ${rawApiKey}` } });
    expect(apiHealth.status()).toBe(200);
    const scopedRead = await apiContext.get('/api/v1/expenses', { headers: { Authorization: `Bearer ${rawApiKey}` } });
    expect(scopedRead.status()).toBe(200);
    const deniedWrite = await apiContext.post('/api/v1/expenses', { headers: { Authorization: `Bearer ${rawApiKey}` }, data: { ncf: 'B0100000102' } });
    expect(deniedWrite.status()).toBe(401);

    const apiReceiptSessionResponse = await apiContext.post('/api/v1/receipt-sessions', { headers: { Authorization: `Bearer ${rawApiKey}` } });
    expect(apiReceiptSessionResponse.status()).toBe(201);
    const apiReceiptSession = (await apiReceiptSessionResponse.json()).data;
    expect((await apiContext.post(`/api/v1/receipt-sessions/${apiReceiptSession.id}/segments`, {
      headers: { Authorization: `Bearer ${rawApiKey}` },
      data: { image_base64: tinyPng, file_name: 'api-tramo.png', mime_type: 'image/png' }
    })).status()).toBe(201);
    expect((await prisma.receiptSession.findUnique({ where: { id: apiReceiptSession.id } }))?.organization_id).toBe(tenantA.organization.id);

    const receiptUpload = await apiContext.post('/api/v1/receipts/upload', {
      headers: { Authorization: `Bearer ${rawApiKey}` },
      data: { image_base64: 'data:image/jpeg;base64,aGVsbG8=', file_name: 'e2e.jpg', mime_type: 'image/jpeg' }
    });
    expect(receiptUpload.status()).toBe(201);
    const receiptData = await receiptUpload.json();
    const persistedReceipt = await prisma.receipt.findUnique({ where: { id: receiptData.receipt_id } });
    expect(persistedReceipt?.organization_id).toBe(tenantA.organization.id);
    expect(persistedReceipt?.image_base64).toContain('aGVsbG8=');
    expect((await apiContext.get(`/api/v1/receipts/${receiptData.receipt_id}`, { headers: { Authorization: `Bearer ${rawApiKey}` } })).status()).toBe(200);

    // Catalogs, AI configuration, ERP configuration and webhooks persist in SQL.
    expect((await tenantAContext.post('/api/categories', { data: { name: 'Categoría SQL', code: 'SQL-01' } })).status()).toBe(201);
    expect((await tenantAContext.post('/api/cost-centers', { data: { name: 'Centro SQL', code: 'CC-SQL' } })).status()).toBe(201);
    expect((await tenantAContext.post('/api/suppliers', { data: { name: 'Proveedor SQL', rnc: '101-00000-2' } })).status()).toBe(201);
    expect((await tenantAContext.post('/api/projects', { data: { name: 'Proyecto SQL', code: 'PRJ-SQL' } })).status()).toBe(201);
    expect((await tenantAContext.post('/api/vehicles', { data: { plate: 'SQL-001', brand: 'Toyota', model: 'Corolla' } })).status()).toBe(201);
    const aiSecret = randomSecret('ai');
    expect((await tenantAContext.post('/api/ai/providers', { data: { provider_type: 'GEMINI', name: 'E2E Gemini', selected_model: 'gemini-2.5-flash', api_key: aiSecret, is_primary: true } })).status()).toBe(200);
    const aiRow = await prisma.aIProviderConfig.findFirst({ where: { organization_id: tenantA.organization.id, name: 'E2E Gemini' } });
    expect(aiRow?.encrypted_key).toBeTruthy();
    expect(aiRow?.encrypted_key).not.toContain(aiSecret);
    const erpSecret = randomSecret('erp');
    expect((await tenantAContext.post('/api/erp/config', { data: { api_endpoint: 'https://erp.invalid/import', api_key: erpSecret, is_enabled: true } })).status()).toBe(200);
    const erpRow = await prisma.eRPConfig.findUnique({ where: { organization_id: tenantA.organization.id } });
    expect(erpRow?.encrypted_api_key).toBeTruthy();
    expect(erpRow?.encrypted_api_key).not.toContain(erpSecret);
    const webhookResponse = await apiContext.post('/api/v1/webhooks', { headers: { Authorization: `Bearer ${rawApiKey}` }, data: { url: 'https://example.invalid/webhook', events: ['receipt.processed'], secret: randomSecret('whsec') } });
    expect(webhookResponse.status()).toBe(201);
    const webhookData = await webhookResponse.json();
    expect((await prisma.webhookSubscription.findUnique({ where: { id: webhookData.data.id } }))?.organization_id).toBe(tenantA.organization.id);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await prisma.apiKeyLog.count({ where: { api_key_id: storedApiKey!.id } })).toBeGreaterThan(0);
    expect((await tenantAContext.delete(`/api/api-keys/${storedApiKey!.id}`)).status()).toBe(200);
    expect((await apiContext.get('/api/v1/expenses', { headers: { Authorization: `Bearer ${rawApiKey}` } })).status()).toBe(401);

    // One-time password reset token: a second use is rejected.
    const resetToken = await prismaRepo.generatePasswordResetToken(employeeId);
    const resetPassword = randomSecret('Reset');
    expect((await employeeContext.post('/api/auth/reset-password', { data: { token: resetToken, new_password: resetPassword } })).status()).toBe(200);
    expect((await employeeContext.get('/api/users')).status()).toBe(401);
    expect((await employeeContext.post('/api/auth/reset-password', { data: { token: resetToken, new_password: randomSecret('Replay') } })).status()).toBe(400);

    // Platform SuperAdmin and server-side impersonation are SQL-authoritative.
    const platformPassword = randomSecret('Platform');
    const platformEmail = `${randomSecret('platform').toLowerCase()}@example.com`;
    const platformId = `e2e_platform_${crypto.randomBytes(8).toString('hex')}`;
    await prisma.organization.upsert({
      where: { id: 'org_allsender_corp' },
      update: { is_active: true },
      create: { id: 'org_allsender_corp', name: 'Organización de Plataforma E2E', rnc: '131-89241-2', plan: 'ENTERPRISE', is_active: true }
    });
    await prisma.user.create({ data: { id: platformId, organization_id: 'org_allsender_corp', email: platformEmail, name: 'E2E Platform Admin', role: 'ADMIN', platform_role: 'SUPER_ADMIN', password_hash: await bcrypt.hash(platformPassword, 12), status: 'ACTIVE', is_active: true } });
    await prisma.membership.create({ data: { id: `membership_${platformId}`, organization_id: 'org_allsender_corp', user_id: platformId, role: 'ADMIN', status: 'ACTIVE', is_active: true } });
    expect((await platformContext.post('/api/auth/login', { data: { email: platformEmail, password: platformPassword } })).status()).toBe(200);
    expect((await platformContext.post(`/api/platform/impersonation/${tenantA.organization.id}/start`)).status()).toBe(200);
    const impersonatedSession = await platformContext.get('/api/session');
    expect(impersonatedSession.status()).toBe(200);
    expect((await impersonatedSession.json()).is_impersonating).toBe(true);

    // Start a second production server against the same SQL database and verify persisted state after restart.
    const restartPort = 3127;
    const restartUrl = `http://127.0.0.1:${restartPort}`;
    const restarted = spawn(process.execPath, ['dist/server.cjs'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: process.env.E2E_RESTART_NODE_ENV || 'production', PORT: String(restartPort), ALLOWED_ORIGINS: restartUrl, TRUST_PROXY_HOPS: '0', EROGAAI_SECRET_KEY: randomSecret('restart_secret'), E2E_ALLOW_INSECURE_COOKIES: 'true' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const restartLogs: string[] = [];
    restarted.stdout?.on('data', chunk => restartLogs.push(String(chunk)));
    restarted.stderr?.on('data', chunk => restartLogs.push(String(chunk)));
    try {
      try {
        await waitForServer(restartUrl);
      } catch (error: any) {
        throw new Error(`${error.message} Logs: ${restartLogs.join('').slice(-4000)}`);
      }
      const afterRestart = await playwrightRequest.newContext({ baseURL: restartUrl });
      try {
        expect((await afterRestart.post('/api/auth/login', { data: { email: tenantAEmail, password: tenantAPassword } })).status()).toBe(200);
        const restartedExpenses = await afterRestart.get('/api/expenses');
        expect(restartedExpenses.status()).toBe(200);
        expect((await restartedExpenses.json()).some((expense: any) => expense.id === expenseA.id)).toBe(true);
        expect((await afterRestart.get('/api/ai/providers')).status()).toBe(200);
        expect((await afterRestart.get('/api/erp/config')).status()).toBe(200);
        expect((await afterRestart.get('/api/categories')).status()).toBe(200);
        const restartedReceiptSession = await afterRestart.get(`/api/receipt-sessions/${receiptSession.id}`);
        expect(restartedReceiptSession.status()).toBe(200);
        expect((await restartedReceiptSession.json()).data.segments).toHaveLength(20);
      } finally {
        await afterRestart.dispose();
      }
    } finally {
      restarted.kill();
    }
  } finally {
    await tenantAContext.dispose();
    await tenantBContext.dispose();
    await apiContext.dispose();
    await platformContext.dispose();
    await employeeContext.dispose();
    await prismaRepo.disconnect();
    await prisma.$disconnect();
  }
});
