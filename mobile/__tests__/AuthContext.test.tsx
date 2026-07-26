import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { authService } from '../src/services/authService';
import * as SecureStore from 'expo-secure-store';

jest.mock('../src/services/authService', () => ({
  authService: { login: jest.fn(), register: jest.fn(), logout: jest.fn() },
}));
jest.mock('../src/services/socketService', () => ({
  connectSocket: jest.fn().mockResolvedValue(null),
  disconnectSocket: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function buildToken(payload: object) {
  const base64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64');
  return `${base64({ alg: 'HS256' })}.${base64(payload)}.signature`;
}

const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it("démarre déconnecté quand aucun token n'est stocké", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.userRole).toBeNull();
  });

  it('se reconnecte automatiquement si un token valide est déjà stocké', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(buildToken({ sub: 'u1', role: 'client' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.userRole).toBe('client');
  });

  it('login() extrait le rôle du token et passe isLoggedIn à true', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: buildToken({ sub: 'u1', role: 'commercant' }),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@a.com', password: 'password123' });
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.userRole).toBe('commercant');
  });

  it('logout() réinitialise isLoggedIn et userRole', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: buildToken({ sub: 'u1', role: 'client' }),
    });
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@a.com', password: 'password123' });
    });
    expect(result.current.isLoggedIn).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.userRole).toBeNull();
  });
});
