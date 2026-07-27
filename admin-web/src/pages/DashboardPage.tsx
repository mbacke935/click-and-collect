'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SyncStatusBadge from '../components/SyncStatusBadge';

const STATUS_COLORS: Record<string, string> = {
  recue: '#D4A843', en_preparation: '#E8C96A', prete: '#4ADE80', recuperee: '#4ADE80', annulee: '#EF4444',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [syncStats, setSyncStats] = useState<any>(null);

  useEffect(() => {
    apiFetch('/admin/dashboard').then(setStats).catch(() => {});
    apiFetch('/admin/commandes').then((data) => setCommandes(data.slice(0, 8))).catch(() => {});
    apiFetch('/sync/stats').then(setSyncStats).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Tableau de bord</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Commandes aujourd'hui" value={stats?.commandesAujourdhui ?? '—'} />
        <StatCard label="Chiffre d'affaires" value={stats ? `${stats.chiffreAffaires?.toLocaleString()} FCFA` : '—'} />
        <StatCard label="Taux de retrait" value={stats ? `${stats.tauxRetrait}%` : '—'} />
        <StatCard label="Boutiques actives" value={stats?.totalBoutiques ?? '—'} />
        <StatCard label="Utilisateurs" value={stats?.totalUsers ?? '—'} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 400 }}>
          <h3 style={{ color: '#D4A843', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Commandes récentes</h3>
          <DataTable
            columns={[
              { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.substring(0, 8)}</span> },
              { key: 'montantTotal', label: 'Montant', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.toLocaleString()} FCFA</span> },
              { key: 'statut', label: 'Statut', render: (v) => (
                <span style={{
                  backgroundColor: `${STATUS_COLORS[v] || '#999'}22`,
                  color: STATUS_COLORS[v] || '#999',
                  padding: '3px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                }}>{v}</span>
              )},
              { key: 'dateCommande', label: 'Date', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
            ]}
            data={commandes}
          />
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ color: '#D4A843', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>File de synchronisation</h3>
          {syncStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#eee', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <SyncStatusBadge statut="synced" /> <span style={{ marginLeft: 'auto' }}>{syncStats.synced}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#eee', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <SyncStatusBadge statut="pending" /> <span style={{ marginLeft: 'auto' }}>{syncStats.pending}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#eee', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <SyncStatusBadge statut="failed" /> <span style={{ marginLeft: 'auto' }}>{syncStats.failed}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#666' }}>Chargement...</p>
          )}
        </div>
      </div>
    </div>
  );
}
