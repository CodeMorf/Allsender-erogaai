import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node dist/server.cjs',
    url: `${process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'}/api/health`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === 'true',
    timeout: 30000,
    env: {
      ...process.env,
    },
  },
});
