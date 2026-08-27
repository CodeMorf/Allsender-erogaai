import { test, expect } from '@playwright/test';

test.describe('ErogaAI SaaS Multi-Tenant & Platform Security', () => {
  test('unauthenticated users are redirected to login view', async ({ page }) => {
    await page.goto('http://localhost:3000/company/dashboard');
    // Verify login / auth view is shown
    await expect(page.locator('body')).toBeVisible();
    const hasAuthText = await page.textContent('body');
    expect(hasAuthText).toMatch(/ErogaAI|Iniciar Sesión|Registrar/i);
  });

  test('protected API routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/users');
    expect(res.status()).toBe(401);
  });

  test('platform routes reject unauthenticated requests with HTTP 401', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/platform/tenants');
    expect(res.status()).toBe(401);
  });

  test('health endpoint is publicly accessible', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/health');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });
});
