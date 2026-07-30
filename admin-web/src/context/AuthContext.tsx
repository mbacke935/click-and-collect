'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getValidSession, login as apiLogin, logout as doLogout, AdminSession } from '../services/api';

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  session: AdminSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  loading: true, isAuthenticated: false, session: null, login: async () => {}, logout: () => {},
});

// Fournit l'état d'authentification réel du back-office (jeton présent, non expiré,
// rôle administrateur) — voir services/api.ts:getValidSession. Remplace le contrôle
// de surface (simple présence d'un jeton) qui laissait passer un jeton expiré ou
// appartenant à un compte non-admin.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getValidSession());
    setLoading(false);
  }, []);

  // AuthProvider vit dans le layout racine et ne remonte donc jamais lors d'une navigation
  // client (router.push) : sans repasser par ce login() pour mettre à jour `session`
  // directement, LoginPage.handleSubmit() posait le jeton en localStorage puis naviguait
  // vers "/", mais isAuthenticated restait faux jusqu'au prochain rechargement complet de
  // page — AdminLayout affichait alors une page blanche au lieu du tableau de bord.
  const login = async (email: string, password: string) => {
    await apiLogin(email, password);
    setSession(getValidSession());
  };

  const logout = () => {
    setSession(null);
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ loading, isAuthenticated: !!session, session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
