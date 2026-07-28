// Formes des réponses de l'API NestJS consommées par le back-office. Elles remplacent les
// `any` qui circulaient jusqu'ici entre services et pages : une faute de frappe sur un nom
// de champ devient une erreur de compilation plutôt qu'une colonne vide à l'écran.

export type UserRole = 'client' | 'commercant' | 'administrateur';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  actif: boolean;
  nom: string | null;
  prenom: string | null;
  dateCreation: string;
}

export interface Boutique {
  id: string;
  nom: string;
  categorie: string;
  adresse: string;
  active: boolean;
  commercant_id: string;
  dateCreation: string;
}

export interface Produit {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  categorie: string | null;
  quantiteStock: number;
  actif: boolean;
  boutique_id: string;
  boutique?: Boutique;
  dateCreation: string;
}

export type StatutCommande = 'recue' | 'en_preparation' | 'prete' | 'recuperee' | 'annulee';
export type ModePaiement = 'en_ligne' | 'sur_place';

export interface Commande {
  id: string;
  statut: StatutCommande;
  montantTotal: number;
  modePaiement: ModePaiement;
  client_id: string;
  boutique_id: string;
  dateCommande: string;
  // Libellés résolus côté serveur à partir des identifiants ci-dessus. Nuls si la
  // boutique ou le compte client a été supprimé depuis la commande.
  boutiqueNom: string | null;
  clientEmail: string | null;
  clientNom: string | null;
}

export type StatutSync = 'synced' | 'pending' | 'failed';

export interface EvenementSync {
  id: string;
  clientEventId: string;
  action: string;
  commande_id: string;
  statut: StatutSync;
  payload: Record<string, unknown>;
  horodatageLocal: string;
  dateReception: string;
}

export interface SyncStats {
  synced: number;
  pending: number;
  failed: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalBoutiques: number;
  totalCommandes: number;
  commandesAujourdhui: number;
  chiffreAffaires: number;
  tauxRetrait: number;
  sync: SyncStats;
}

export interface ParametresPlateforme {
  id: string;
  devise: string;
  modeMaintenance: boolean;
}
