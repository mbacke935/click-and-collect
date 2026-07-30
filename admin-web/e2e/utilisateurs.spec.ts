import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// Parcours CRUD complet à travers la vraie UI, la vraie API et la vraie base : création,
// recherche, suspension/réactivation (avec vérification que la connexion est bien bloquée
// côté API pendant la suspension), modification et suppression.
test.describe('Gestion des utilisateurs', () => {
  const suffixe = Date.now();
  const emailUtilisateur = `e2e_web_util_${suffixe}@test.com`;

  test('crée, recherche, suspend, modifie puis supprime un compte', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/utilisateurs');
    await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible();

    // Création — { exact: true } : sinon "Email"/"Nom" matchent aussi en sous-chaîne les
    // boutons de tri d'en-tête de colonne ("Trier par Email", "Trier par Nom"...).
    await page.getByLabel('Email', { exact: true }).fill(emailUtilisateur);
    await page.getByLabel('Mot de passe (8 caractères minimum)').fill('password123');
    await page.getByLabel('Prénom', { exact: true }).fill('Fatou');
    await page.getByLabel('Nom', { exact: true }).fill('E2EWeb');
    await page.getByRole('button', { name: 'Créer le compte' }).click();

    // Recherche
    await page.getByLabel('Rechercher un utilisateur').fill(emailUtilisateur);
    const ligne = page.getByRole('row', { name: new RegExp(emailUtilisateur) });
    await expect(ligne).toBeVisible();
    await expect(ligne.getByText('Actif')).toBeVisible();

    // Suspension — le badge devient "Suspendu" et la connexion est effectivement bloquée.
    await ligne.getByRole('button', { name: /Désactiver le compte de/ }).click();
    await expect(ligne.getByText('Suspendu')).toBeVisible();

    const connexionSuspendue = await page.request.post('http://localhost:3001/auth/login', {
      data: { email: emailUtilisateur, password: 'password123' },
    });
    expect(connexionSuspendue.status()).toBe(403);

    // Réactivation
    await ligne.getByRole('button', { name: /Activer le compte de/ }).click();
    await expect(ligne.getByText('Actif')).toBeVisible();

    // Modification
    await ligne.getByRole('button', { name: 'Modifier' }).click();
    const champNom = page.getByLabel('Nom', { exact: true });
    await expect(champNom).toHaveValue('E2EWeb');
    await champNom.fill('E2EWebRenomme');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(ligne.getByText('E2EWebRenomme')).toBeVisible();

    // Suppression
    page.once('dialog', (dialog) => dialog.accept());
    await ligne.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByRole('row', { name: new RegExp(emailUtilisateur) })).toHaveCount(0);
  });

  test('filtre par rôle', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/utilisateurs');

    await page.getByRole('group', { name: 'Filtrer par rôle' }).getByRole('button', { name: /^commercant/ }).click();
    await expect(page.getByRole('row', { name: /administrateur/ })).toHaveCount(0);
  });
});
