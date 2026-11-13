import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  reporter: [['list']],
  webServer: [
    {
      command: 'pnpm --filter @jinsei/api start',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
