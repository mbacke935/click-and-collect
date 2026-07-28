'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 14, color: '#eee',
  background: '#1a1a1a', border: '1px solid #444', borderRadius: 4,
  marginBottom: 14, outline: 'none',
};

// Changement du mot de passe du compte administrateur connecté. Exige l'ancien mot de
// passe (pas seulement la présence d'une session) et une confirmation du nouveau, pour
// éviter un changement accidentel qui verrouillerait le compte.
function MonCompte() {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [succes, setSucces] = useState(false);

  const changerMotDePasse = async () => {
    setMessage('');
    setSucces(false);
    if (nouveau.length < 8) {
      setMessage('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (nouveau !== confirmation) {
      setMessage('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          ancienMotDePasse: ancien,
          nouveauMotDePasse: nouveau,
          confirmationMotDePasse: confirmation,
        }),
      });
      setAncien(''); setNouveau(''); setConfirmation('');
      setSucces(true);
      setMessage('Mot de passe mis à jour.');
    } catch (err: any) {
      setMessage(err.message || 'Échec du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333', marginBottom: 16, maxWidth: 420 }}>
      <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Mon compte — changer le mot de passe</h3>

      <label style={{ display: 'block', color: '#999', fontSize: 12, marginBottom: 6 }} htmlFor="ancien-mdp">
        Mot de passe actuel
      </label>
      <input id="ancien-mdp" type="password" style={inputStyle} value={ancien} onChange={(e) => setAncien(e.target.value)} />

      <label style={{ display: 'block', color: '#999', fontSize: 12, marginBottom: 6 }} htmlFor="nouveau-mdp">
        Nouveau mot de passe
      </label>
      <input id="nouveau-mdp" type="password" style={inputStyle} value={nouveau} onChange={(e) => setNouveau(e.target.value)} />

      <label style={{ display: 'block', color: '#999', fontSize: 12, marginBottom: 6 }} htmlFor="confirmation-mdp">
        Confirmer le nouveau mot de passe
      </label>
      <input id="confirmation-mdp" type="password" style={{ ...inputStyle, marginBottom: 18 }} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />

      {message && <p style={{ color: succes ? '#4ADE80' : '#EF4444', fontSize: 13, marginBottom: 12 }}>{message}</p>}

      <button
        onClick={changerMotDePasse}
        disabled={saving}
        style={{
          padding: '10px 20px', fontSize: 13, fontWeight: 700,
          backgroundColor: '#D4A843', color: '#111', border: 'none',
          borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Modification...' : 'Changer le mot de passe'}
      </button>
    </div>
  );
}

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

      <MonCompte />

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
