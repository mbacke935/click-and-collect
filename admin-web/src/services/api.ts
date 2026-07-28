'use client';

const API_URL = 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch('/auth/login', {
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
