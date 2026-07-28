'use client';

import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { COLORS, STYLES } from '../constants/theme';
import type { Commande, DashboardStats } from '../types';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatutCommandeBadge from '../components/StatutCommandeBadge';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function DashboardPage() {
  const stats = useApiData<DashboardStats>(() => adminApi.getDashboard());
  const commandes = useApiData<Commande[]>(() => adminApi.getCommandes());

  const s = stats.data;
  const dernieresCommandes = (commandes.data ?? []).slice(0, 8);
  const sync = s?.sync;

  return (
    <div>
      <PageHeader
        titre="Tableau de bord"
        actions={
          <button
            onClick={() => { stats.recharger(); commandes.recharger(); }}
            style={STYLES.buttonSecondary}
          >
            Rafraîchir
          </button>
        }
      />

      {stats.erreur && (
        <p style={{ ...STYLES.erreur, marginBottom: 20 }}>
          {stats.erreur}
          <button onClick={stats.recharger} style={{ ...STYLES.buttonSmall, marginLeft: 12, borderColor: COLORS.red, color: COLORS.red }}>
            Réessayer
          </button>
        </p>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 28,
      }}>
        <StatCard label="Commandes aujourd'hui" value={s?.commandesAujourdhui ?? '—'} />
        <StatCard
          label="Chiffre d'affaires"
          value={s ? s.chiffreAffaires.toLocaleString('fr-FR') : '—'}
          detail={s ? 'FCFA cumulés' : undefined}
        />
        <StatCard
          label="Taux de retrait"
          value={s ? `${s.tauxRetrait}%` : '—'}
          detail={s ? `${s.totalCommandes} commandes au total` : undefined}
          accent={s && s.tauxRetrait < 50 ? COLORS.orange : COLORS.green}
        />
        <StatCard label="Boutiques actives" value={s?.totalBoutiques ?? '—'} />
        <StatCard label="Utilisateurs" value={s?.totalUsers ?? '—'} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 2, minWidth: 380 }}>
          <h3 style={{ color: COLORS.gold, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Commandes récentes
          </h3>
          <DataTable<Commande>
            loading={commandes.loading}
            erreur={commandes.erreur}
            onReessayer={commandes.recharger}
            emptyMessage="Aucune commande enregistrée."
            columns={[
              { key: 'id', label: 'ID', render: (v) => <span style={STYLES.mono}>{String(v).substring(0, 8)}</span> },
              { key: 'montantTotal', label: 'Montant', render: (v) => <span style={STYLES.mono}>{Number(v).toLocaleString('fr-FR')} FCFA</span> },
              { key: 'statut', label: 'Statut', render: (v) => <StatutCommandeBadge statut={String(v)} /> },
              { key: 'dateCommande', label: 'Date', render: (v) => new Date(String(v)).toLocaleDateString('fr-FR') },
            ]}
            data={dernieresCommandes}
          />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ color: COLORS.gold, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            File de synchronisation
          </h3>
          {stats.loading && <p style={{ color: COLORS.mutedLight, fontSize: 13 }}>Chargement…</p>}
          {sync && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(['synced', 'pending', 'failed'] as const).map((statut) => (
                <div key={statut} style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  color: COLORS.white, padding: '10px 0', borderBottom: `1px solid ${COLORS.line}`,
                }}>
                  <SyncStatusBadge statut={statut} />
                  <span style={{ marginLeft: 'auto', ...STYLES.mono }}>{sync[statut]}</span>
                </div>
              ))}
              {sync.failed > 0 && (
                <p style={{ ...STYLES.erreur, marginTop: 12 }}>
                  {sync.failed} événement{sync.failed > 1 ? 's' : ''} en échec à examiner.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
