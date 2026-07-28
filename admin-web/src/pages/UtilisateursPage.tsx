'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';

const ROLE_COLORS: Record<string, string> = { client: '#D4A843', commercant: '#4ADE80', administrateur: '#E8C96A' };
const ROLES = ['client', 'commercant', 'administrateur'];

const FORM_VIDE = { email: '', password: '', nom: '', prenom: '', role: 'client' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13, color: '#eee',
  background: '#1a1a1a', border: '1px solid #444', borderRadius: 4, outline: 'none',
};
const labelStyle: React.CSSProperties = { display: 'block', color: '#999', fontSize: 11, marginBottom: 5, textTransform: 'uppercase' };

export default function UtilisateursPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('');
  const [erreur, setErreur] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [formErreur, setFormErreur] = useState('');

  const charger = () => {
    const path = filtre ? `/admin/users?role=${filtre}` : '/admin/users';
    apiFetch(path).then(setUsers).catch(() => setErreur('Impossible de charger les utilisateurs.'));
  };

  useEffect(() => { charger(); }, [filtre]);

  const toggle = async (id: string, actif: boolean) => {
    await apiFetch(`/admin/users/${id}/toggle?active=${actif}`, { method: 'PATCH' });
    charger();
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setForm({ email: user.email, password: '', nom: user.nom || '', prenom: user.prenom || '', role: user.role });
    setFormErreur('');
  };

  const startCreate = () => { setEditingId(null); setForm(FORM_VIDE); setFormErreur(''); };

  const enregistrer = async () => {
    if (!form.email.trim() || (!editingId && form.password.length < 8)) {
      setFormErreur(editingId ? "L'email est obligatoire." : "L'email est obligatoire et le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setSaving(true);
    setFormErreur('');
    try {
      if (editingId) {
        await apiFetch(`/admin/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ email: form.email, nom: form.nom, prenom: form.prenom, role: form.role }),
        });
      } else {
        await apiFetch('/admin/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      startCreate();
      charger();
    } catch (err: any) {
      setFormErreur(err.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (user: any) => {
    if (!window.confirm(`Supprimer définitivement le compte ${user.email} ?`)) return;
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: 'DELETE' });
      charger();
    } catch (err: any) {
      alert(err.message || 'Échec de la suppression.');
    }
  };

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Utilisateurs</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', ...ROLES].map((r) => (
          <button key={r} onClick={() => setFiltre(r)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filtre === r ? 'none' : '1px solid #666',
            backgroundColor: filtre === r ? '#D4A843' : 'transparent',
            color: filtre === r ? '#111' : '#999',
          }}>
            {r || 'Tous'}
          </button>
        ))}
      </div>
      {erreur && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{erreur}</p>}
      <DataTable
        columns={[
          { key: 'prenom', label: 'Prénom' },
          { key: 'nom', label: 'Nom' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Rôle', render: (v) => (
            <span style={{ color: ROLE_COLORS[v] || '#999', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>{v}</span>
          )},
          { key: 'actif', label: 'Statut', render: (v, row) => (
            <button onClick={() => toggle(row.id, !v)} style={{
              padding: '4px 12px', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: 'none', textTransform: 'uppercase',
              backgroundColor: v ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: v ? '#4ADE80' : '#EF4444',
            }}>
              {v ? 'Actif' : 'Suspendu'}
            </button>
          )},
          { key: 'dateCreation', label: 'Inscription', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
          { key: 'id', label: 'Actions', render: (id, row) => (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => startEdit(row)} style={{
                background: 'transparent', border: '1px solid #666', color: '#999',
                padding: '4px 10px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
              }}>
                Modifier
              </button>
              {id !== session?.id && (
                <button onClick={() => supprimer(row)} style={{
                  background: 'transparent', border: '1px solid #EF4444', color: '#EF4444',
                  padding: '4px 10px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
                }}>
                  Supprimer
                </button>
              )}
            </div>
          )},
        ]}
        data={users}
      />

      <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333', marginTop: 24, maxWidth: 480 }}>
        <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {editingId ? 'Modifier le compte' : 'Nouveau compte'}
        </h3>

        <label style={labelStyle} htmlFor="u-email">Email</label>
        <input id="u-email" style={{ ...inputStyle, marginBottom: 14 }} value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />

        {!editingId && (
          <>
            <label style={labelStyle} htmlFor="u-password">Mot de passe</label>
            <input id="u-password" type="password" style={{ ...inputStyle, marginBottom: 14 }} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-prenom">Prénom</label>
            <input id="u-prenom" style={inputStyle} value={form.prenom}
              onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-nom">Nom</label>
            <input id="u-nom" style={inputStyle} value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </div>
        </div>

        <label style={labelStyle} htmlFor="u-role">Rôle</label>
        <select id="u-role" style={{ ...inputStyle, marginBottom: 18 }} value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {formErreur && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{formErreur}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          {editingId && (
            <button onClick={startCreate} style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 700, background: 'transparent',
              color: '#999', border: '1px solid #666', borderRadius: 6, cursor: 'pointer',
            }}>
              Annuler
            </button>
          )}
          <button onClick={enregistrer} disabled={saving} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700,
            backgroundColor: '#D4A843', color: '#111', border: 'none',
            borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
