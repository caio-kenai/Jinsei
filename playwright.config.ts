import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list']],
  webServer:
    process.env.SELFHOST_E2E === '1'
      ? []
      : [
          {
            command: 'pnpm --filter @jinsei/api start',
            env: {
              THROTTLE_SCALE: '50',
              // Uploads use a temporary folder unless an S3 service is configured.
              MEDIA_DIR: process.env.MEDIA_DIR ?? join(tmpdir(), 'jinsei-e2e-media'),
              // E-mails are written to files so tests can follow their links.
              MAIL_CAPTURE_DIR: join(tmpdir(), 'jinsei-e2e-mail'),
            },
            url: 'http://127.0.0.1:4000/api/health',
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
          {
            command: process.env.CI
              ? 'pnpm --filter @jinsei/web start'
              : 'pnpm --filter @jinsei/web dev',
            url: 'http://localhost:3000/login',
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
          },
        ],
});
