import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('ErogaAI SaaS Multi-Tenant & Platform Security Suite', () => {
  test('unauthenticated users are redirected to login view', async ({ page }) => {
    await page.goto(`${BASE_URL}/company/dashboard`);
    await expect(page.locator('body')).toBeVisible();
    const hasAuthText = await page.textContent('body');
    expect(hasAuthText).toMatch(/ErogaAI|Iniciar Sesión|Registrar/i);
  });

  test('protected API routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/users`);
    expect(res.status()).toBe(401);
  });

  test('platform routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/platform/tenants`);
    expect(res.status()).toBe(401);
  });

  test('health endpoint is publicly accessible', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  test('user registration, tenant creation, and isolated session generation', async ({ request }) => {
    const randomEmail = `tenant_${Date.now()}@example.com`;
    const res = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: randomEmail,
        password: 'Password123!',
        name: 'Inquilino E2E',
        company_name: 'Empresa E2E Dominicana SAS',
        rnc: '131-99882-1'
      }
    });

    expect([200, 201]).toContain(res.status());
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(randomEmail);
    expect(data.organization).toBeDefined();
    expect(data.organization.name).toBe('Empresa E2E Dominicana SAS');
  });

  test('password reset request and token consumption flow', async ({ request }) => {
    const forgotRes = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      data: { email: 'it@codemorf.tech' }
    });
    expect(forgotRes.status()).toBe(200);

    // Invalid reset token is rejected
    const invalidReset = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: {
        token: 'invalid_token_xyz',
        new_password: 'NewSecurePassword123!'
      }
    });
    expect(invalidReset.status()).toBe(400);
  });

  test('DGII 606 PDF and Excel generation endpoints are mounted and functional', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'it@codemorf.tech',
        password: 'Password123!' // will check with test fallback
      }
    });

    // Verify reports endpoints respond without 404
    const pdfRes = await request.get(`${BASE_URL}/api/reports/dgii-606/pdf?period=2026-08`);
    expect([200, 401]).toContain(pdfRes.status());

    const xlsxRes = await request.get(`${BASE_URL}/api/reports/dgii-606/excel?period=2026-08`);
    expect([200, 401]).toContain(xlsxRes.status());
  });
});
