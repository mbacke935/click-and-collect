'use client';

import { useEffect, useState } from 'react';
import { adminApi, changePassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, STYLES } from '../constants/theme';
import PageHeader from '../components/PageHeader';

// Changement du mot de passe du compte administrateur connecté. Exige l'ancien mot de
// passe (pas seulement la présence d'une session) et une confirmation du nouveau, pour
// éviter un changement accidentel qui verrouillerait le compte.
function MonCompte() {
  const { session } = useAuth();
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
    if (nouveau === ancien) {
      setMessage("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(ancien, nouveau, confirmation);
      setAncien(''); setNouveau(''); setConfirmation('');
      setSucces(true);
      setMessage('Mot de passe mis à jour.');
    } catch (err) {
      setMessage((err as Error).message || 'Échec du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...STYLES.card, marginBottom: 16, maxWidth: 440 }}>
      <h3 style={{ color: COLORS.white, fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Mon compte
      </h3>
      <p style={{ color: COLORS.muted, fontSize: 12, marginTop: 0, marginBottom: 18 }}>
        Connecté en tant que <span style={STYLES.mono}>{session?.email}</span>
      </p>

      <label style={STYLES.label} htmlFor="ancien-mdp">Mot de passe actuel</label>
      <input
        id="ancien-mdp" type="password" autoComplete="current-password"
        style={{ ...STYLES.input, marginBottom: 14 }}
        value={ancien} onChange={(e) => setAncien(e.target.value)}
      />

      <label style={STYLES.label} htmlFor="nouveau-mdp">Nouveau mot de passe (8 caractères minimum)</label>
      <input
        id="nouveau-mdp" type="password" autoComplete="new-password"
        style={{ ...STYLES.input, marginBottom: 14 }}
        value={nouveau} onChange={(e) => setNouveau(e.target.value)}
      />

      <label style={STYLES.label} htmlFor="confirmation-mdp">Confirmer le nouveau mot de passe</label>
      <input
        id="confirmation-mdp" type="password" autoComplete="new-password"
        style={{ ...STYLES.input, marginBottom: 18 }}
        value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
      />

      {message && (
        <p role="status" style={{ ...(succes ? STYLES.succes : STYLES.erreur), marginBottom: 12 }}>
          {message}
        </p>
      )}

      <button
        onClick={changerMotDePasse}
        disabled={saving}
        style={{ ...STYLES.buttonPrimary, opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Modification…' : 'Changer le mot de passe'}
      </button>
    </div>
  );
}

// Paramètres globaux de la plateforme, réellement persistés côté backend
// (table parametres_plateforme) — cf. cas d'utilisation Administrateur
// « Configurer les paramètres globaux de la plateforme ».
export default function ParametresPage() {
  const [devise, setDevise] = useState('');
  const [modeMaintenance, setModeMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    adminApi.getParametres()
      .then((data) => { setDevise(data.devise); setModeMaintenance(data.modeMaintenance); })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  const enregistrer = async () => {
    setSaving(true);
    setMessage('');
    setSucces(false);
    try {
      await adminApi.updateParametres({ devise, modeMaintenance });
      setSucces(true);
      setMessage('Paramètres enregistrés.');
    } catch (err) {
      setMessage((err as Error).message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader titre="Paramètres" />

      <MonCompte />

      <div style={{ ...STYLES.card, marginBottom: 16, maxWidth: 440 }}>
        <h3 style={{ color: COLORS.white, fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
          Plateforme
        </h3>

        {loading ? (
          <p style={{ color: COLORS.mutedLight, fontSize: 13, margin: 0 }}>Chargement…</p>
        ) : (
          <>
            <label style={STYLES.label} htmlFor="devise">Devise</label>
            <input
              id="devise" style={{ ...STYLES.input, marginBottom: 18 }}
              value={devise} onChange={(e) => setDevise(e.target.value)}
            />

            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, color: COLORS.muted,
              fontSize: 13, marginBottom: 20, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={modeMaintenance}
                onChange={(e) => setModeMaintenance(e.target.checked)}
              />
              Mode maintenance (bloque temporairement les nouvelles commandes)
            </label>

            {message && (
              <p role="status" style={{ ...(succes ? STYLES.succes : STYLES.erreur), marginBottom: 12 }}>
                {message}
              </p>
            )}

            <button
              onClick={enregistrer}
              disabled={saving}
              style={{ ...STYLES.buttonPrimary, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        )}
      </div>

      <div style={{ ...STYLES.card, maxWidth: 440 }}>
        <h3 style={{ color: COLORS.white, fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 8 }}>
          Base de données
        </h3>
        <p style={{ color: COLORS.muted, fontSize: 13, margin: 0 }}>PostgreSQL · connectée</p>
      </div>
    </div>
  );
}
