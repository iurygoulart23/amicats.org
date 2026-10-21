import { defineConfig, devices } from '@playwright/test';
import { API_URL, SITE_URL, TOKEN_TAREFAS } from './e2e/apoio';

/**
 * Testes ponta a ponta em ambiente isolado (não usa os servidores de desenvolvimento):
 * banco descartável na porta 5435, API na 3334 (simulador do Mercado Pago e caixa de e-mails)
 * e site na 3001. Rode com `npm run e2e`, que recria o banco antes.
 */
export default defineConfig({
  testDir: './e2e',
  // Os roteiros compartilham o mesmo banco: rodam em sequência.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: SITE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: './api',
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: '3334',
        DATABASE_URL: 'postgresql://amicats:amicats@localhost:5435/amicats',
        WEB_ORIGIN: SITE_URL,
        COOKIE_SECURE: 'false',
        CAIXA_DEV: 'true',
        MP_SIMULADO: 'true',
        TAREFAS_TOKEN: TOKEN_TAREFAS,
        RESEND_API_KEY: '',
        MP_ACCESS_TOKEN: '',
      },
    },
    {
      command: 'npx vite dev --port 3001 --strictPort',
      url: `${SITE_URL}/pt-BR/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: API_URL,
        DEVTOOLS_EVENT_BUS: 'false',
      },
    },
  ],
});
