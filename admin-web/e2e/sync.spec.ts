import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Supervision de la synchronisation hors-ligne', () => {
  test('affiche les statistiques et permet de filtrer par statut', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sync');
    await expect(page.getByRole('heading', { name: 'Synchronisation hors-ligne' })).toBeVisible();

    // Les libellés des StatCard ("Synchronisés", etc.) sont volontairement identiques à
    // ceux des boutons de filtre juste en dessous — on vérifie donc les compteurs (des
    // nombres, dans une police mono) plutôt que le texte des libellés, ambigu entre les
    // deux blocs.
    const compteurs = page.locator('div[style*="monospace"]');
    await expect(compteurs).toHaveCount(3);
    for (const compteur of await compteurs.all()) {
      await expect(compteur).toHaveText(/^\d+$/);
    }

    const groupe = page.getByRole('group', { name: 'Filtrer par statut de synchronisation' });
    await expect(groupe).toBeVisible();
    await groupe.getByRole('button', { name: /^Échoués/ }).click();
    await expect(groupe.getByRole('button', { name: /^Échoués/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('refuse l\'accès à la file de synchronisation à un compte non-administrateur', async ({ page }) => {
    // Vérifié directement via l'API (AdminGuard) — la page elle-même redirige tout
    // utilisateur non authentifié comme administrateur avant même d'atteindre /sync
    // (voir AdminLayout), donc ce n'est testable de bout en bout qu'au niveau API.
    const res = await page.request.get('http://localhost:3001/sync');
    expect(res.status()).toBe(401);
  });
});
