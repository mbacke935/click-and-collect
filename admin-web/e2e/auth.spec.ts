import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

test.describe('Authentification', () => {
  test('redirige vers /login quand non authentifié', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('affiche une erreur avec des identifiants invalides', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(ADMIN_EMAIL);
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('connecte un administrateur et affiche le tableau de bord', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(ADMIN_EMAIL);
    await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  });

  test('se déconnecte et bloque de nouveau les pages protégées', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(ADMIN_EMAIL);
    await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/utilisateurs');
    await expect(page).toHaveURL(/\/login/);
  });
});
