import { defineConfig } from '@playwright/test';

const ADMIN_WEB_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';

// Suite e2e réelle (navigateur + back-office Next.js + API NestJS + Postgres, sans mock) —
// voir e2e/global-setup.ts pour l'amorçage des données (admin, boutique, produits...).
// Un seul worker : les specs partagent une base réelle et une politique de données non
// destructive (comptes/boutiques à suffixe unique par exécution) plutôt que des mocks ou
// une base réinitialisée entre tests — le parallélisme risquerait des lectures de tableaux
// (ex. nombre total d'utilisateurs) incohérentes entre deux specs concurrentes.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: ADMIN_WEB_URL,
    trace: 'retain-on-failure',
  },
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../backend',
      url: `${BACKEND_URL}/boutiques`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: ADMIN_WEB_URL,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
