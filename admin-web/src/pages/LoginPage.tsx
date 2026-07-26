'use client';

import { useState } from 'react';
import { login } from '../services/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#111',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
    }}>
      <div style={{ width: 360 }}>
        <h1 style={{ color: '#D4A843', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          Click &amp; Collect
        </h1>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          Administration
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Adresse e-mail" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '12px 0', fontSize: 14, color: '#eee',
              background: 'transparent', border: 'none', borderBottom: '1px solid #666',
              marginBottom: 18, outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '12px 0', fontSize: 14, color: '#eee',
              background: 'transparent', border: 'none', borderBottom: '1px solid #666',
              marginBottom: 24, outline: 'none',
            }}
          />
          {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: 14, fontSize: 15, fontWeight: 700,
              backgroundColor: '#D4A843', color: '#111', border: 'none',
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
