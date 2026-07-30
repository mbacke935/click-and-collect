import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ClientNavigator from '../src/navigation/ClientNavigator';

// Parcours client de bout en bout à travers la navigation réelle (React Navigation n'est
// pas mocké) : vitrine → catalogue → panier → créneau → statut de commande. Seule la
// couche réseau (services/api) est simulée, pour vérifier que les écrans s'enchaînent
// correctement et se transmettent les bonnes données via route.params, sans dépendre d'un
// serveur (voir aussi backend/test/commande-flow.e2e-spec.ts pour le même parcours côté API).

const BOUTIQUE = { id: 'b1', nom: 'Boulangerie Test', adresse: '1 rue du Test', categorie: 'boulangerie', horaires: null };
const PRODUIT = { id: 'p1', nom: 'Baguette', prix: 300 };
const PANIER = { id: 'panier1', lignes: [{ id: 'l1', produit_id: 'p1', quantite: 2, prixUnitaire: 300 }] };
const CRENEAU = { id: 'c1', jour: '2026-08-01', heureDebut: '17:00', heureFin: '17:30', capaciteRestante: 3 };
const COMMANDE = {
  id: 'cmd1', statut: 'recue', montantTotal: 600, boutique_id: 'b1',
  boutiqueNom: 'Boulangerie Test', boutiqueAdresse: '1 rue du Test',
  creneau: CRENEAU,
  billet: { id: 'billet1', qrCodePayload: 'aa11:bb22' },
  panier: { lignes: [{ id: 'l1', quantite: 2, prixUnitaire: 300, produit: { nom: 'Baguette' } }] },
};

// Typées explicitement en (...args) => Promise<any> (plutôt que de laisser le paramètre
// `url: string` de l'implémentation déterminer la signature) : le factory ci-dessous doit
// pouvoir relayer les appels via spread, et surtout doit référencer mockGet/mockPost de
// façon paresseuse (fermeture, pas affectation directe) — au moment où jest.mock() est
// hoisté et où le module est réellement chargé (au premier import transitif de
// ClientNavigator), ces const ne sont pas encore initialisées ; seul un appel différé au
// moment du rendu (bien après la fin du chargement du fichier) les trouve définies.
const mockGet: jest.Mock<Promise<any>, any[]> = jest.fn((url: string) => {
  if (url === '/boutiques') return Promise.resolve({ data: [BOUTIQUE] });
  if (url === `/boutiques/${BOUTIQUE.id}/produits`) return Promise.resolve({ data: [PRODUIT] });
  if (url === `/boutiques/${BOUTIQUE.id}/panier`) return Promise.resolve({ data: PANIER });
  if (url === `/boutiques/${BOUTIQUE.id}/creneaux`) return Promise.resolve({ data: [CRENEAU] });
  return Promise.reject(new Error(`GET non mocké : ${url}`));
});
const mockPost: jest.Mock<Promise<any>, any[]> = jest.fn((url: string) => {
  if (url === `/boutiques/${BOUTIQUE.id}/panier/articles`) return Promise.resolve({ data: PANIER });
  if (url === '/commandes') return Promise.resolve({ data: COMMANDE });
  return Promise.reject(new Error(`POST non mocké : ${url}`));
});

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args) },
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));

// Pas de géolocalisation en environnement de test : le tri par proximité (BoutiqueListScreen)
// doit retomber silencieusement sur l'ordre par défaut plutôt que de planter.
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

describe('Parcours client — de la vitrine à la confirmation de commande', () => {
  it('permet de composer un panier et de confirmer une commande sur un créneau choisi', async () => {
    render(
      <NavigationContainer>
        <ClientNavigator />
      </NavigationContainer>,
    );

    // Vitrine : la boutique du mock apparaît, on l'ouvre.
    fireEvent.press(await screen.findByText('Boulangerie Test'));

    // Catalogue : on ajoute deux fois le même produit puis on va au panier.
    await screen.findByText('Baguette');
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(await screen.findByText('Voir mon panier (2)'));
    expect(mockPost).toHaveBeenCalledWith(
      `/boutiques/${BOUTIQUE.id}/panier/articles`, { produit_id: 'p1', quantite: 2 },
    );

    // Panier : le total (2 × 300) est correct — affiché à la fois sur la ligne d'article
    // et sur la ligne "Total" puisqu'il n'y a qu'un seul article, d'où les deux occurrences.
    await screen.findByText('Mon panier');
    expect(screen.getAllByText('600 FCFA').length).toBeGreaterThan(0);
    fireEvent.press(await screen.findByText('Choisir un créneau de retrait'));

    // Créneau : on sélectionne le créneau disponible puis on confirme (paiement sur place
    // par défaut).
    await screen.findByText('Créneau de retrait');
    fireEvent.press(await screen.findByText('17:00–17:30'));
    fireEvent.press(screen.getByText('Confirmer la commande'));

    // Statut de commande : le billet, le reçu détaillé et le total s'affichent.
    await screen.findByText('Votre billet de retrait');
    expect(screen.getByText('À retirer chez')).toBeTruthy();
    expect(screen.getByText('Détail du reçu')).toBeTruthy();
    expect(screen.getByText('Baguette')).toBeTruthy();
  });
});
