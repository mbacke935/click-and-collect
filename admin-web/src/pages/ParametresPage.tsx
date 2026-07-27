'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

// Paramètres globaux de la plateforme, réellement persistés côté backend
// (table parametres_plateforme) — cf. cas d'utilisation Administrateur
// "Configurer les paramètres globaux de la plateforme".
export default function ParametresPage() {
  const [devise, setDevise] = useState('');
  const [modeMaintenance, setModeMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch('/admin/parametres')
      .then((data) => { setDevise(data.devise); setModeMaintenance(data.modeMaintenance); })
      .finally(() => setLoading(false));
  }, []);

  const enregistrer = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/admin/parametres', {
        method: 'PATCH',
        body: JSON.stringify({ devise, modeMaintenance }),
      });
      setMessage('Paramètres enregistrés.');
    } catch {
      setMessage("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: '#666' }}>Chargement...</p>;

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Paramètres</h2>
      <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333', marginBottom: 16, maxWidth: 420 }}>
        <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Plateforme</h3>

        <label style={{ display: 'block', color: '#999', fontSize: 12, marginBottom: 6 }} htmlFor="devise">
          Devise
        </label>
        <input
          id="devise"
          value={devise}
          onChange={(e) => setDevise(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, color: '#eee',
            background: '#1a1a1a', border: '1px solid #444', borderRadius: 4,
            marginBottom: 18, outline: 'none',
          }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={modeMaintenance}
            onChange={(e) => setModeMaintenance(e.target.checked)}
          />
          Mode maintenance (bloque temporairement les nouvelles commandes)
        </label>

        {message && <p style={{ color: message.includes('Échec') ? '#EF4444' : '#4ADE80', fontSize: 13, marginBottom: 12 }}>{message}</p>}

        <button
          onClick={enregistrer}
          disabled={saving}
          style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700,
            backgroundColor: '#D4A843', color: '#111', border: 'none',
            borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333', maxWidth: 420 }}>
        <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Base de données</h3>
        <p style={{ color: '#999', fontSize: 13 }}>PostgreSQL · connectée</p>
      </div>
    </div>
  );
}
