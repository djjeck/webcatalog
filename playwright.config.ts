import { defineConfig } from '@playwright/test';
import path from 'path';

const testDbPath = path.resolve(
  __dirname,
  'server/__tests__/utils/test tree.w3cat'
);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: [
      'npm run build --workspace=client',
      '&&',
      'npm run build --workspace=server',
      '&&',
      `DB_PATH='${testDbPath}'`,
      'SERVE_STATIC=true',
      'STATIC_PATH=client/dist',
      'PORT=3000',
      'NODE_ENV=production',
      'node server/dist/index.js',
    ].join(' '),
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
