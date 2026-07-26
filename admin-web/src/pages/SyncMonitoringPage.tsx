'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function SyncMonitoringPage() {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/sync/stats').then(setStats).catch(() => {});
    apiFetch('/sync').then(setEvents).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Synchronisation hors-ligne</h2>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Synchronisés" value={stats.synced} />
          <StatCard label="En attente" value={stats.pending} />
          <StatCard label="Échoués" value={stats.failed} />
        </div>
      )}
      <h3 style={{ color: '#D4A843', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Historique récent</h3>
      <DataTable
        columns={[
          { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.substring(0, 8)}</span> },
          { key: 'action', label: 'Action' },
          { key: 'commande_id', label: 'Commande', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.substring(0, 8)}</span> },
          { key: 'statut', label: 'Statut', render: (v) => <SyncStatusBadge statut={v} /> },
          { key: 'horodatageLocal', label: 'Horodatage local', render: (v) => new Date(v).toLocaleString('fr-FR') },
          { key: 'dateReception', label: 'Reçu serveur', render: (v) => new Date(v).toLocaleString('fr-FR') },
        ]}
        data={events}
      />
    </div>
  );
}
