'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import DataTable from '../components/DataTable';

const ROLE_COLORS: Record<string, string> = { client: '#D4A843', commercant: '#4ADE80', administrateur: '#E8C96A' };

export default function UtilisateursPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('');

  useEffect(() => {
    const path = filtre ? `/admin/users?role=${filtre}` : '/admin/users';
    apiFetch(path).then(setUsers).catch(() => {});
  }, [filtre]);

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
      <DataTable
        columns={[
          { key: 'prenom', label: 'Prénom' },
          { key: 'nom', label: 'Nom' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Rôle', render: (v) => (
            <span style={{ color: ROLE_COLORS[v] || '#999', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>{v}</span>
          )},
          { key: 'dateCreation', label: 'Inscription', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
        ]}
        data={users}
      />
    </div>
  );
}
