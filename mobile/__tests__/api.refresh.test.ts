// Teste l'intercepteur de rafraîchissement automatique de session (services/api.ts, §5.4)
// en capturant les gestionnaires réellement enregistrés sur l'instance axios via
// axios.create() — c'est le seul point d'accès possible : les intercepteurs sont internes
// au module et non exportés individuellement.
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { setSessionExpiredHandler } from '../src/services/api';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios', () => {
  const instance: any = jest.fn((config: any) => Promise.resolve({ config, viaInstance: true }));
  instance.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return { __esModule: true, default: { create: jest.fn(() => instance), post: jest.fn() } };
});

// Capturés une seule fois : api.ts appelle axios.create() (et enregistre ses intercepteurs)
// exactement une fois, au chargement du module — mélanger jest.resetModules() avec l'import
// statique de SecureStore ci-dessus rendrait cet import obsolète (il pointerait vers
// d'anciens jest.fn(), différents de ceux qu'une nouvelle instance de api.ts utiliserait).
const mockedAxios = axios as unknown as { create: jest.Mock; post: jest.Mock };
const instance: any = mockedAxios.create.mock.results[0].value;
const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0];
const responseError = instance.interceptors.response.use.mock.calls[0][1];

describe('api — rafraîchissement automatique du token sur 401', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it("injecte le token courant dans l'en-tête Authorization de chaque requête", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-actuel');
    const config = await requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer token-actuel');
  });

  it("rafraîchit le token sur un 401 et rejoue la requête d'origine", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (cle: string) =>
      (cle === 'refreshToken' ? 'refresh-valide' : null));
    mockedAxios.post.mockResolvedValue({
      data: { accessToken: 'nouveau-access', refreshToken: 'nouveau-refresh' },
    });

    const original: any = { url: '/commandes/me', headers: {} };
    const resultat = await responseError({ response: { status: 401 }, config: original });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'), { refreshToken: 'refresh-valide' },
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'nouveau-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'nouveau-refresh');
    expect(original.headers.Authorization).toBe('Bearer nouveau-access');
    expect(instance).toHaveBeenCalledWith(original);
    expect(resultat).toEqual({ config: original, viaInstance: true });
  });

  it("ne tente jamais de rafraîchir sur un 401 renvoyé par /auth/login lui-même", async () => {
    const original = { url: '/auth/login', headers: {} };
    const erreur = { response: { status: 401 }, config: original };

    await expect(responseError(erreur)).rejects.toBe(erreur);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('déconnecte proprement si le rafraîchissement échoue aussi (refresh token expiré)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (cle: string) =>
      (cle === 'refreshToken' ? 'refresh-expire' : null));
    mockedAxios.post.mockRejectedValue(new Error('refresh token expiré'));

    const onSessionExpired = jest.fn();
    setSessionExpiredHandler(onSessionExpired);

    const original = { url: '/commandes/me', headers: {} };
    await expect(responseError({ response: { status: 401 }, config: original })).rejects.toBeTruthy();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('ne retente qu\'une seule fois par requête (pas de boucle infinie si le nouveau token est aussi rejeté)', async () => {
    const original = { url: '/commandes/me', headers: {}, _retry: true };
    await expect(responseError({ response: { status: 401 }, config: original })).rejects.toBeTruthy();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
