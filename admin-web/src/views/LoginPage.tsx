'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { COLORS, STYLES } from '../constants/theme';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: COLORS.black,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ color: COLORS.gold, fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          Click &amp; Collect
        </h1>
        <p style={{ color: COLORS.muted, textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          Administration
        </p>

        <form onSubmit={handleSubmit}>
          <label style={STYLES.label} htmlFor="login-email">Adresse e-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...STYLES.input, marginBottom: 16 }}
          />

          <label style={STYLES.label} htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...STYLES.input, marginBottom: 24 }}
          />

          {error && (
            <p role="alert" style={{ ...STYLES.erreur, marginBottom: 12 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...STYLES.buttonPrimary,
              width: '100%', padding: 14, fontSize: 15,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
