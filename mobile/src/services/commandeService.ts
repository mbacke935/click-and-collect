import api from './api';

export const commandeService = {
  getMesCommandes: () => api.get('/commandes/me'),
  getCommande: (id: string) => api.get(`/commandes/${id}`),
  creerCommande: (panier_id: string, creneau_id: string) =>
    api.post('/commandes', { panier_id, creneau_id }),
  getCommandesBoutique: (boutiqueId: string) =>
    api.get(`/commandes/boutique/${boutiqueId}`),
  updateStatut: (id: string, statut: string) =>
    api.patch(`/commandes/${id}/statut`, { statut }),
};
