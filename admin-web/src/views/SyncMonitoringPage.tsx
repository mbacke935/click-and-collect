'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { COLORS, STYLES } from '../constants/theme';
import type { EvenementSync, SyncStats } from '../types';
import PageHeader from '../components/PageHeader';
import FilterChips from '../components/FilterChips';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SyncStatusBadge from '../components/SyncStatusBadge';

const INTERVALLE_RAFRAICHISSEMENT_MS = 15_000;

// Écart entre l'horodatage local de l'appareil et la réception serveur : c'est la durée
// pendant laquelle l'événement est resté en file hors-ligne. C'est l'indicateur le plus
// parlant de cette page, il n'était pas affiché jusqu'ici.
function formatDelaiSync(horodatageLocal: string, dateReception: string): string {
  const deltaMs = new Date(dateReception).getTime() - new Date(horodatageLocal).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return '—';
  const secondes = Math.round(deltaMs / 1000);
  if (secondes < 60) return `${secondes} s`;
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${minutes % 60} min`;
}

export default function SyncMonitoringPage() {
  const [filtre, setFiltre] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const stats = useApiData<SyncStats>(() => adminApi.getSyncStats());
  const events = useApiData<EvenementSync[]>(() => adminApi.getSyncEvents());

  const rechargerStats = stats.recharger;
  const rechargerEvents = events.recharger;

  // La file évolue toute seule dès qu'un commerçant retrouve du réseau : sans
  // rafraîchissement, l'écran de supervision affichait un état figé au chargement.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => { rechargerStats(); rechargerEvents(); }, INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, rechargerStats, rechargerEvents]);

  const tousEvents = useMemo(() => events.data ?? [], [events.data]);
  const eventsAffiches = useMemo(
    () => (filtre ? tousEvents.filter((e) => e.statut === filtre) : tousEvents),
    [tousEvents, filtre],
  );

  const s = stats.data;

  return (
    <div>
      <PageHeader
        titre="Synchronisation hors-ligne"
        sousTitre="File des retraits validés sans réseau, transmis au retour de connexion"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: COLORS.muted, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto ({INTERVALLE_RAFRAICHISSEMENT_MS / 1000} s)
            </label>
            <button onClick={() => { rechargerStats(); rechargerEvents(); }} style={STYLES.buttonSecondary}>
              Rafraîchir
            </button>
          </div>
        }
      />

      {stats.erreur && <p style={{ ...STYLES.erreur, marginBottom: 20 }}>{stats.erreur}</p>}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 28,
      }}>
        <StatCard label="Synchronisés" value={s?.synced ?? '—'} accent={COLORS.green} />
        <StatCard label="En attente" value={s?.pending ?? '—'} accent={COLORS.orange} />
        <StatCard
          label="Échoués"
          value={s?.failed ?? '—'}
          accent={s && s.failed > 0 ? COLORS.red : COLORS.mutedLight}
          detail={s && s.failed > 0 ? 'À examiner' : undefined}
        />
      </div>

      <h3 style={{ color: COLORS.gold, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Historique récent
      </h3>

      <FilterChips
        legende="Filtrer par statut de synchronisation"
        valeurActive={filtre}
        onChange={setFiltre}
        options={[
          { valeur: '', label: 'Tous', compte: tousEvents.length },
          { valeur: 'synced', label: 'Synchronisés' },
          { valeur: 'pending', label: 'En attente' },
          { valeur: 'failed', label: 'Échoués' },
        ]}
      />

      <DataTable<EvenementSync>
        loading={events.loading}
        erreur={events.erreur}
        onReessayer={rechargerEvents}
        emptyMessage={filtre ? 'Aucun événement avec ce statut.' : 'Aucun événement de synchronisation.'}
        data={eventsAffiches}
        taillePage={25}
        columns={[
          { key: 'action', label: 'Action', triable: true },
          {
            key: 'commande_id', label: 'Commande',
            render: (v) => <span style={STYLES.mono}>{String(v).substring(0, 8)}</span>,
          },
          { key: 'statut', label: 'Statut', triable: true, render: (v) => <SyncStatusBadge statut={String(v)} /> },
          {
            key: 'horodatageLocal', label: 'Validé hors-ligne', triable: true,
            render: (v) => new Date(String(v)).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
          },
          {
            key: 'dateReception', label: 'Reçu serveur', triable: true,
            render: (v) => new Date(String(v)).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
          },
          {
            key: 'clientEventId', label: 'Délai de sync',
            render: (_v, row) => (
              <span style={STYLES.mono}>{formatDelaiSync(row.horodatageLocal, row.dateReception)}</span>
            ),
          },
        ]}
      />
    </div>
  );
}
