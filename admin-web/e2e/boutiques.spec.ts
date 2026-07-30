import { test, expect } from '@playwright/test';
import { loginAsAdmin, BOUTIQUE_NOM } from './helpers';

test.describe('Supervision des boutiques', () => {
  test('recherche une boutique, trie la colonne Nom, puis la désactive', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/boutiques');
    await expect(page.getByRole('heading', { name: 'Boutiques' })).toBeVisible();

    await page.getByLabel('Rechercher une boutique').fill(BOUTIQUE_NOM);
    const ligne = page.getByRole('row', { name: new RegExp(BOUTIQUE_NOM) });
    await expect(ligne).toBeVisible();
    await expect(ligne.getByText('Active')).toBeVisible();

    await ligne.getByRole('button', { name: /Désactiver la boutique/ }).click();
    await expect(ligne.getByText('Inactive')).toBeVisible();

    // Une boutique désactivée disparaît de la vitrine publique.
    const vitrine = await page.request.get('http://localhost:3001/boutiques');
    const boutiques = await vitrine.json();
    expect(boutiques.some((b: any) => b.nom === BOUTIQUE_NOM)).toBe(false);

    // Réactivation, pour ne pas laisser la boutique de test dans un état incohérent.
    await ligne.getByRole('button', { name: /Activer la boutique/ }).click();
    await expect(ligne.getByText('Active')).toBeVisible();
  });

  test('le tri sur l\'en-tête "Nom" inverse l\'ordre des lignes au premier et au second clic', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/boutiques');

    const premiereColonneNom = () => page.locator('tbody tr').first().locator('td').first().innerText();

    const trierParNom = page.getByRole('button', { name: 'Trier par Nom' });
    await trierParNom.click();
    await expect(page.locator('th[aria-sort="ascending"]')).toHaveCount(1);
    const premierAsc = await premiereColonneNom();

    await trierParNom.click();
    await expect(page.locator('th[aria-sort="descending"]')).toHaveCount(1);
    const premierDesc = await premiereColonneNom();

    expect(premierAsc).not.toBe(premierDesc);
  });
});
