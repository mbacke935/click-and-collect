'use client';

import { useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { STATUT_COMMANDE_LABELS, STYLES } from '../constants/theme';
import type { Commande } from '../types';
import PageHeader from '../components/PageHeader';
import FilterChips from '../components/FilterChips';
import DataTable from '../components/DataTable';
import StatutCommandeBadge from '../components/StatutCommandeBadge';

const STATUTS = ['recue', 'en_preparation', 'prete', 'recuperee', 'annulee'];

export default function CommandesPage() {
  const [filtre, setFiltre] = useState('');
  const { data, loading, erreur, recharger } = useApiData<Commande[]>(
    () => adminApi.getCommandes(filtre || undefined),
    [filtre],
  );

  const commandes = useMemo(() => data ?? [], [data]);
  const chiffreAffaires = useMemo(
    () => commandes.reduce((total, c) => total + c.montantTotal, 0),
    [commandes],
  );

  return (
    <div>
      <PageHeader
        titre="Commandes"
        sousTitre={
          commandes.length > 0
            ? `${commandes.length} commande${commandes.length > 1 ? 's' : ''} · ${chiffreAffaires.toLocaleString('fr-FR')} FCFA`
            : undefined
        }
        actions={<button onClick={recharger} style={STYLES.buttonSecondary}>Rafraîchir</button>}
      />

      <FilterChips
        legende="Filtrer par statut"
        valeurActive={filtre}
        onChange={setFiltre}
        options={[
          { valeur: '', label: 'Toutes' },
          ...STATUTS.map((s) => ({ valeur: s, label: STATUT_COMMANDE_LABELS[s] })),
        ]}
      />

      <DataTable<Commande>
        loading={loading}
        erreur={erreur}
        onReessayer={recharger}
        emptyMessage={filtre ? `Aucune commande « ${STATUT_COMMANDE_LABELS[filtre]} ».` : 'Aucune commande.'}
        data={commandes}
        taillePage={25}
        columns={[
          { key: 'id', label: 'ID', render: (v) => <span style={STYLES.mono}>{String(v).substring(0, 8)}</span> },
          {
            key: 'montantTotal', label: 'Montant', triable: true,
            render: (v) => <span style={STYLES.mono}>{Number(v).toLocaleString('fr-FR')} FCFA</span>,
          },
          { key: 'statut', label: 'Statut', triable: true, render: (v) => <StatutCommandeBadge statut={String(v)} /> },
          { key: 'modePaiement', label: 'Paiement', triable: true, render: (v) => (v === 'en_ligne' ? 'En ligne' : 'Sur place') },
          {
            key: 'dateCommande', label: 'Date', triable: true,
            render: (v) => new Date(String(v)).toLocaleString('fr-FR', {
              dateStyle: 'short', timeStyle: 'short',
            }),
          },
        ]}
      />
    </div>
  );
}
