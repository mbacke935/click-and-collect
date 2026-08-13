import axios from 'axios';
import * as SecureStore from '../storage/secureStore';
import { API_URL } from '../constants/theme';

// Timeout explicite : sans lui, une requête vers une API_URL injoignable (ex. adresse IP
// locale qui a changé — voir constants/theme.ts) reste en attente indéfiniment, laissant
// croire à un problème de lenteur de l'application plutôt qu'à un problème réseau.
const api = axios.create({ baseURL: API_URL, timeout: 10000 });

// Injecte le token JWT dans chaque requête si disponible
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Callback injecté par AuthContext pour déconnecter l'utilisateur si le rafraîchissement
// échoue (refresh token expiré ou compte suspendu) — évite une dépendance circulaire entre
// ce module (chargé très tôt) et le contexte React d'authentification.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Ces appels ne doivent jamais déclencher de tentative de rafraîchissement : un 401 sur
// /auth/login ou /auth/register signifie des identifiants invalides (pas un jeton expiré),
// et /auth/refresh est justement l'appel qui rafraîchit.
const ROUTES_SANS_RAFRAICHISSEMENT = ['/auth/login', '/auth/register', '/auth/refresh'];

// Mutualise les tentatives de rafraîchissement concurrentes (plusieurs requêtes en échec
// en même temps ne doivent déclencher qu'un seul appel à /auth/refresh).
let rafraichissementEnCours: Promise<string | null> | null = null;

async function rafraichirAccessToken(): Promise<string | null> {
  if (!rafraichissementEnCours) {
    rafraichissementEnCours = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return null;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        return data.accessToken as string;
      } catch {
        return null;
      }
    })();
  }
  const token = await rafraichissementEnCours;
  rafraichissementEnCours = null;
  return token;
}

// Rejoue automatiquement une requête ayant échoué faute d'accessToken expiré, après l'avoir
// rafraîchi une seule fois via /auth/refresh (dossier de spécifications §5.4 « JWT avec
// rafraîchissement »). Si le rafraîchissement échoue à son tour (refresh token expiré ou
// compte suspendu), l'utilisateur est déconnecté plutôt que de rester bloqué sur des appels
// qui échoueront indéfiniment.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const estRouteAuth = ROUTES_SANS_RAFRAICHISSEMENT.some((route) => original?.url?.includes(route));
    if (error.response?.status === 401 && original && !original._retry && !estRouteAuth) {
      original._retry = true;
      const nouveauToken = await rafraichirAccessToken();
      if (nouveauToken) {
        original.headers.Authorization = `Bearer ${nouveauToken}`;
        return api(original);
      }
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);

export default api;
