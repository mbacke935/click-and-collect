import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';
import * as SecureStore from 'expo-secure-store';
import { connectSocket, disconnectSocket } from '../services/socketService';

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  userRole: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Décode le payload JWT (sans vérifier la signature — c'est le serveur qui la vérifie)
function decodeToken(token: string) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const decoded = decodeToken(token);
        setUserRole(decoded?.role || null);
        setIsLoggedIn(true);
        connectSocket();
      }
      setLoading(false);
    })();
  }, []);

  const login = async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    const decoded = decodeToken(data.accessToken);
    setUserRole(decoded?.role || null);
    setIsLoggedIn(true);
    await connectSocket();
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    const decoded = decodeToken(data.accessToken);
    setUserRole(decoded?.role || null);
    setIsLoggedIn(true);
    await connectSocket();
  };

  const logout = async () => {
    disconnectSocket();
    await authService.logout();
    setIsLoggedIn(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, userRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
