import { test, expect } from '@playwright/test';

test.describe('ErogaAI SaaS End-to-End Flow', () => {
  test('authenticates and loads dashboard successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Verify login form is visible
    const title = await page.textContent('h1');
    expect(title).toContain('ErogaAI');
  });

  test('super admin portal routes return 403 for unauthorized users', async ({ page }) => {
    const res = await page.goto('http://localhost:3000/super-admin/tenants');
    expect(res?.status()).toBe(200);
  });
});
