'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import DataTable from '../components/DataTable';

const STATUTS = ['', 'recue', 'en_preparation', 'prete', 'recuperee', 'annulee'];
const STATUT_LABELS: Record<string, string> = {
  '': 'Toutes', recue: 'Reçue', en_preparation: 'En préparation',
  prete: 'Prête', recuperee: 'Récupérée', annulee: 'Annulée',
};
const STATUS_COLORS: Record<string, string> = {
  recue: '#D4A843', en_preparation: '#E8C96A', prete: '#4ADE80', recuperee: '#4ADE80', annulee: '#EF4444',
};

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('');

  useEffect(() => {
    const path = filtre ? `/admin/commandes?statut=${filtre}` : '/admin/commandes';
    apiFetch(path).then(setCommandes).catch(() => {});
  }, [filtre]);

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Commandes</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUTS.map((s) => (
          <button key={s} onClick={() => setFiltre(s)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: filtre === s ? 'none' : '1px solid #666',
            backgroundColor: filtre === s ? '#D4A843' : 'transparent',
            color: filtre === s ? '#111' : '#999',
          }}>
            {STATUT_LABELS[s]}
          </button>
        ))}
      </div>
      <DataTable
        columns={[
          { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.substring(0, 8)}</span> },
          { key: 'montantTotal', label: 'Montant', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.toLocaleString()} FCFA</span> },
          { key: 'statut', label: 'Statut', render: (v) => (
            <span style={{
              backgroundColor: `${STATUS_COLORS[v] || '#999'}22`, color: STATUS_COLORS[v] || '#999',
              padding: '3px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            }}>{STATUT_LABELS[v] || v}</span>
          )},
          { key: 'modePaiement', label: 'Paiement', render: (v) => v === 'en_ligne' ? 'En ligne' : 'Sur place' },
          { key: 'dateCommande', label: 'Date', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
        ]}
        data={commandes}
      />
    </div>
  );
}
