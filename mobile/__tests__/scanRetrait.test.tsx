import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as crypto from 'crypto';
import ScanRetraitScreen from '../src/screens/commercant/ScanRetraitScreen';
import { billetCode } from '../src/utils/billetCode';

// Reproduit le chiffrement effectué côté serveur (backend/src/commandes/commandes.service.ts)
// pour obtenir un qrCodePayload que ScanRetraitScreen peut réellement déchiffrer — même
// convention que __tests__/qrCipher.test.ts.
function chiffrerBillet(payload: object): string {
  const secret = 'qr-ticket-shared-secret-dev'; // doit matcher constants/theme.ts
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Le mock global __mocks__/expo-sqlite.js est un stub muet (getAllAsync renvoie toujours
// [], quoi que runAsync ait "inséré") — suffisant pour des tests de rendu, pas ici où le
// scénario dépend d'un aller-retour réel écriture/lecture dans sync_queue. On mocke donc
// storage/database.ts directement avec un état en mémoire, comme __tests__/syncService.test.ts.
let mockRows: any[] = [];
jest.mock('../src/storage/database', () => ({
  getDb: async () => ({
    runAsync: jest.fn(async (sql: string, ...params: any[]) => {
      if (sql.startsWith('INSERT INTO sync_queue')) {
        const [eventId, action, commande_id, billet_id, payload, horodatageLocal, statut] = params;
        mockRows.push({ eventId, action, commande_id, billet_id, payload, horodatageLocal, statut });
      } else if (sql.includes("UPDATE sync_queue SET statut = 'synced'")) {
        const [eventId] = params;
        const row = mockRows.find((r) => r.eventId === eventId);
        if (row) row.statut = 'synced';
      } else if (sql.includes("UPDATE sync_queue SET statut = 'echec'")) {
        const [payload, eventId] = params;
        const row = mockRows.find((r) => r.eventId === eventId);
        if (row) { row.statut = 'echec'; row.payload = payload; }
      }
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes("statut != 'synced'")) {
        return mockRows.filter((r) => r.statut !== 'synced');
      }
      return mockRows;
    }),
    getFirstAsync: jest.fn(async () => ({ n: mockRows.filter((r) => r.statut !== 'synced').length })),
  }),
}));

const mockPost = jest.fn();
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { post: (...args: any[]) => mockPost(...args) },
}));

// Caméra indisponible dans l'environnement de test : force le repli sur la saisie
// manuelle, qui est le chemin testé ici.
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

// Scanne/valide un billet de retrait hors-ligne (§3.5, §5.3.c) : déchiffrement local du
// billet, contrôle du code court, puis synchronisation — en vérifiant explicitement que le
// résultat renvoyé par le serveur pour CET événement précis (pas seulement le succès HTTP
// global du lot) détermine l'écran affiché (voir le correctif anti-rejeu §5.4).
describe("ScanRetraitScreen — validation d'un retrait par saisie manuelle", () => {
  const commandeId = 'cmd-e2e-1234';
  const commande = {
    id: commandeId,
    billet: {
      id: 'billet1',
      qrCodePayload: chiffrerBillet({ commandeId, boutique: 'b1', montant: 600, articles: [] }),
    },
  };
  const navigation = { popToTop: jest.fn(), navigate: jest.fn() };
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRows = [];
    mockPost.mockReset();
    navigation.popToTop.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('refuse un code qui ne correspond pas au billet, sans contacter le serveur', async () => {
    render(<ScanRetraitScreen route={{ params: { commande } }} navigation={navigation} />);

    fireEvent.changeText(screen.getByPlaceholderText('N° 0231'), 'ZZZZ');
    fireEvent.press(screen.getByText('Valider le retrait'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Code incorrect', expect.any(String)));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('valide le retrait quand le code est correct et que le serveur confirme la synchronisation', async () => {
    mockPost.mockImplementation((url: string, body: any) => {
      if (url === '/sync') {
        return Promise.resolve({ data: [{ clientEventId: body.events[0].eventId, statut: 'synced' }] });
      }
      return Promise.reject(new Error(`POST non mocké : ${url}`));
    });

    render(<ScanRetraitScreen route={{ params: { commande } }} navigation={navigation} />);
    fireEvent.changeText(screen.getByPlaceholderText('N° 0231'), billetCode(commandeId));
    fireEvent.press(screen.getByText('Valider le retrait'));

    await screen.findByText('Commande récupérée');
    expect(screen.getByText('Retrait validé et synchronisé')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledWith('/sync', expect.objectContaining({
      events: [expect.objectContaining({ action: 'retrait_valide', commande_id: commandeId })],
    }));
  });

  it('affiche un retrait "en attente de synchronisation" si le serveur est injoignable', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    render(<ScanRetraitScreen route={{ params: { commande } }} navigation={navigation} />);
    fireEvent.changeText(screen.getByPlaceholderText('N° 0231'), billetCode(commandeId));
    fireEvent.press(screen.getByText('Valider le retrait'));

    await screen.findByText('Commande récupérée');
    expect(screen.getByText('Retrait validé — en attente de synchronisation')).toBeTruthy();
  });

  it('refuse le retrait — sans afficher l\'écran de succès — si le serveur l\'a déjà refusé (anti-rejeu)', async () => {
    mockPost.mockImplementation((url: string, body: any) => {
      if (url === '/sync') {
        return Promise.resolve({
          data: [{
            clientEventId: body.events[0].eventId, statut: 'failed',
            payload: { error: 'Ce billet a déjà été retiré le 30/07/2026 10:00:00.' },
          }],
        });
      }
      return Promise.reject(new Error(`POST non mocké : ${url}`));
    });

    render(<ScanRetraitScreen route={{ params: { commande } }} navigation={navigation} />);
    fireEvent.changeText(screen.getByPlaceholderText('N° 0231'), billetCode(commandeId));
    fireEvent.press(screen.getByText('Valider le retrait'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      'Retrait refusé', 'Ce billet a déjà été retiré le 30/07/2026 10:00:00.',
    ));
    expect(screen.queryByText('Commande récupérée')).toBeNull();
  });
});
