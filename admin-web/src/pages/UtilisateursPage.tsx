'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import DataTable from '../components/DataTable';

const ROLE_COLORS: Record<string, string> = { client: '#D4A843', commercant: '#4ADE80', administrateur: '#E8C96A' };

export default function UtilisateursPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = () => {
    const path = filtre ? `/admin/users?role=${filtre}` : '/admin/users';
    apiFetch(path).then(setUsers).catch(() => setErreur('Impossible de charger les utilisateurs.'));
  };

  useEffect(charger, [filtre]);

  const toggle = async (id: string, actif: boolean) => {
    await apiFetch(`/admin/users/${id}/toggle?active=${actif}`, { method: 'PATCH' });
    charger();
  };

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Utilisateurs</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'client', 'commercant', 'administrateur'].map((r) => (
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
        ]}
        data={users}
      />
    </div>
  );
}
