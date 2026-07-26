'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import DataTable from '../components/DataTable';

export default function BoutiquesPage() {
  const [boutiques, setBoutiques] = useState<any[]>([]);

  const charger = () => apiFetch('/admin/boutiques').then(setBoutiques).catch(() => {});
  useEffect(() => { charger(); }, []);

  const toggle = async (id: string, active: boolean) => {
    await apiFetch(`/admin/boutiques/${id}/toggle?active=${active}`, { method: 'PATCH' });
    charger();
  };

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Boutiques</h2>
      <DataTable
        columns={[
          { key: 'nom', label: 'Nom' },
          { key: 'categorie', label: 'Catégorie', render: (v) => (
            <span style={{ color: '#D4A843', fontSize: 12, textTransform: 'uppercase' }}>{v}</span>
          )},
          { key: 'adresse', label: 'Adresse' },
          { key: 'active', label: 'Statut', render: (v, row) => (
            <button onClick={() => toggle(row.id, !v)} style={{
              padding: '4px 12px', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: 'none', textTransform: 'uppercase',
              backgroundColor: v ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: v ? '#4ADE80' : '#EF4444',
            }}>
              {v ? 'Active' : 'Inactive'}
            </button>
          )},
          { key: 'dateCreation', label: 'Création', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
        ]}
        data={boutiques}
      />
    </div>
  );
}
