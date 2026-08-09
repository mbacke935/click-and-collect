'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { COLORS, STYLES } from '../constants/theme';

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLORS.mutedLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx={12} cy={12} r={3} />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1={1} y1={1} x2={23} y2={23} />
        </>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...STYLES.input, marginBottom: 0, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>

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
