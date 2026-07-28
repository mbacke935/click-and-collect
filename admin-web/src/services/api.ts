'use client';

import type {
  Boutique, Commande, DashboardStats, EvenementSync,
  ParametresPlateforme, Produit, SyncStats, User, UserRole,
} from '../types';

const API_URL = 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    // Jeton expiré ou révoqué en cours de session : on purge et on renvoie vers la
    // connexion plutôt que d'afficher une erreur incompréhensible sur chaque écran.
    // Exclut les routes /auth/ : un 401 y signifie « identifiants invalides » ou
    // « ancien mot de passe incorrect », pas une session périmée.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      logout();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  // 204 No Content (ex. DELETE) : pas de corps à désérialiser.
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('adminToken', data.accessToken);
  return data;
}

export function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login';
}

export function changePassword(
  ancienMotDePasse: string,
  nouveauMotDePasse: string,
  confirmationMotDePasse: string,
) {
  return apiFetch<void>('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse, confirmationMotDePasse }),
  });
}

// --- Ressources d'administration ---
// Fonctions typées par ressource : les pages ne construisent plus d'URL à la main, et le
// type de retour est vérifié à la compilation.

export const adminApi = {
  getDashboard: () => apiFetch<DashboardStats>('/admin/dashboard'),

  getUsers: (role?: string) =>
    apiFetch<User[]>(role ? `/admin/users?role=${role}` : '/admin/users'),
  createUser: (data: { email: string; password: string; role: string; nom?: string; prenom?: string }) =>
    apiFetch<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { email?: string; role?: UserRole | string; nom?: string; prenom?: string }) =>
    apiFetch<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  toggleUser: (id: string, actif: boolean) =>
    apiFetch<User>(`/admin/users/${id}/toggle?active=${actif}`, { method: 'PATCH' }),

  getBoutiques: () => apiFetch<Boutique[]>('/admin/boutiques'),
  toggleBoutique: (id: string, active: boolean) =>
    apiFetch<Boutique>(`/admin/boutiques/${id}/toggle?active=${active}`, { method: 'PATCH' }),

  getCommandes: (statut?: string) =>
    apiFetch<Commande[]>(statut ? `/admin/commandes?statut=${statut}` : '/admin/commandes'),

  getProduits: () => apiFetch<Produit[]>('/admin/produits'),
  toggleProduit: (id: string, actif: boolean) =>
    apiFetch<Produit>(`/admin/produits/${id}/toggle?active=${actif}`, { method: 'PATCH' }),

  getParametres: () => apiFetch<ParametresPlateforme>('/admin/parametres'),
  updateParametres: (data: Partial<Pick<ParametresPlateforme, 'devise' | 'modeMaintenance'>>) =>
    apiFetch<ParametresPlateforme>('/admin/parametres', { method: 'PATCH', body: JSON.stringify(data) }),

  getSyncStats: () => apiFetch<SyncStats>('/sync/stats'),
  getSyncEvents: () => apiFetch<EvenementSync[]>('/sync'),
};

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payloadB64Url = token.split('.')[1];
    const payloadB64 = payloadB64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

// Vérifie le jeton en profondeur (bien formé, non expiré, rôle administrateur) plutôt que
// sa simple présence — un jeton expiré ou appartenant à un compte non-admin ne doit pas
// laisser passer la garde d'authentification du back-office.
export function getValidSession(): AdminSession | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  const nowSeconds = Date.now() / 1000;
  if (!payload || payload.exp < nowSeconds || payload.role !== 'administrateur') {
    localStorage.removeItem('adminToken');
    return null;
  }
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export function isLoggedIn(): boolean {
  return !!getValidSession();
}
