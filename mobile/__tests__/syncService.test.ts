// Fausse base en mémoire ciblant précisément la table sync_queue (voir storage/database.ts),
// pour tester la logique métier de syncService.ts sans dépendre du binding natif SQLite.
// Préfixée "mock" : jest.mock() hisse son factory avant les imports et n'autorise que les
// variables externes préfixées "mock" (insensible à la casse) à être référencées à l'intérieur.
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
      }
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes("statut != 'synced'")) {
        return mockRows.filter((r) => r.statut !== 'synced').sort((a, b) => a.horodatageLocal.localeCompare(b.horodatageLocal));
      }
      return mockRows;
    }),
    getFirstAsync: jest.fn(async () => ({ n: mockRows.filter((r) => r.statut !== 'synced').length })),
  }),
}));

const mockApiPost = jest.fn();
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { post: (...args: any[]) => mockApiPost(...args) },
}));

import { enqueueEvent, getPendingEvents, countPendingEvents, flushSyncQueue } from '../src/services/syncService';

describe('syncService — file de synchronisation locale', () => {
  beforeEach(() => {
    mockRows = [];
    mockApiPost.mockReset();
  });

  it('empile un événement avec un identifiant unique et le statut "en_attente"', async () => {
    const eventId = await enqueueEvent('retrait_valide', 'cmd1', 'billet1', { statut: 'recuperee' });

    expect(eventId).toBeTruthy();
    const pending = await getPendingEvents();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      eventId, action: 'retrait_valide', commande_id: 'cmd1', billet_id: 'billet1', statut: 'en_attente',
    });
    expect(pending[0].payload).toEqual({ statut: 'recuperee' });
  });

  it('deux événements distincts reçoivent des identifiants différents (anti-rejeu)', async () => {
    const id1 = await enqueueEvent('retrait_valide', 'cmd1', undefined, {});
    const id2 = await enqueueEvent('retrait_valide', 'cmd2', undefined, {});
    expect(id1).not.toBe(id2);
  });

  it('countPendingEvents reflète le nombre d\'événements non synchronisés', async () => {
    await enqueueEvent('retrait_valide', 'cmd1', undefined, {});
    await enqueueEvent('retrait_valide', 'cmd2', undefined, {});
    expect(await countPendingEvents()).toBe(2);
  });

  describe('flushSyncQueue', () => {
    it('ne fait rien et ne renvoie aucune erreur quand la file est vide', async () => {
      const result = await flushSyncQueue();
      expect(result).toEqual({ synced: 0, remaining: 0 });
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('marque les événements comme synchronisés après un envoi réussi au serveur', async () => {
      await enqueueEvent('retrait_valide', 'cmd1', 'billet1', { statut: 'recuperee' });
      mockApiPost.mockResolvedValue({ data: [] });

      const result = await flushSyncQueue();

      expect(result).toEqual({ synced: 1, remaining: 0 });
      expect(mockApiPost).toHaveBeenCalledWith('/sync', {
        events: [expect.objectContaining({ action: 'retrait_valide', commande_id: 'cmd1' })],
      });
      expect(await countPendingEvents()).toBe(0);
    });

    it('laisse les événements en file si le serveur est injoignable (hors-ligne)', async () => {
      await enqueueEvent('retrait_valide', 'cmd1', undefined, {});
      mockApiPost.mockRejectedValue(new Error('Network Error'));

      const result = await flushSyncQueue();

      expect(result).toEqual({ synced: 0, remaining: 1 });
      expect(await countPendingEvents()).toBe(1);
    });
  });
});
