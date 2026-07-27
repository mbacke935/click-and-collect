'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getValidSession, logout as doLogout, AdminSession } from '../services/api';

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  session: AdminSession | null;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  loading: true, isAuthenticated: false, session: null, logout: () => {},
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

  const logout = () => {
    setSession(null);
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ loading, isAuthenticated: !!session, session, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
