import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
export const BOUTIQUE_NOM = process.env.E2E_BOUTIQUE_NOM!;

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL('/');
}
