'use client';

import { useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { COLORS, STATUT_COMMANDE_LABELS, STYLES } from '../constants/theme';
import type { Commande } from '../types';
import PageHeader from '../components/PageHeader';
import FilterChips from '../components/FilterChips';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import StatutCommandeBadge from '../components/StatutCommandeBadge';

const STATUTS = ['recue', 'en_preparation', 'prete', 'recuperee', 'annulee'];

export default function CommandesPage() {
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  const { data, loading, erreur, recharger } = useApiData<Commande[]>(
    () => adminApi.getCommandes(filtre || undefined),
    [filtre],
  );

  const commandes = useMemo(() => data ?? [], [data]);

  const commandesAffichees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return commandes;
    return commandes.filter((c) =>
      [c.boutiqueNom, c.clientNom, c.clientEmail, c.id].some((champ) =>
        champ?.toLowerCase().includes(terme),
      ),
    );
  }, [commandes, recherche]);

  // Le total suit ce qui est affiché : après une recherche, un chiffre d'affaires
  // portant sur l'ensemble des commandes serait trompeur.
  const chiffreAffaires = useMemo(
    () => commandesAffichees.reduce((total, c) => total + c.montantTotal, 0),
    [commandesAffichees],
  );

  return (
    <div>
      <PageHeader
        titre="Commandes"
        sousTitre={
          commandesAffichees.length > 0
            ? `${commandesAffichees.length} commande${commandesAffichees.length > 1 ? 's' : ''} · ${chiffreAffaires.toLocaleString('fr-FR')} FCFA`
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

      <SearchInput
        label="Rechercher une commande"
        placeholder="Boutique, client ou identifiant…"
        valeur={recherche}
        onChange={setRecherche}
      />

      <DataTable<Commande>
        loading={loading}
        erreur={erreur}
        onReessayer={recharger}
        emptyMessage={
          recherche
            ? 'Aucune commande ne correspond à cette recherche.'
            : filtre ? `Aucune commande « ${STATUT_COMMANDE_LABELS[filtre]} ».` : 'Aucune commande.'
        }
        data={commandesAffichees}
        taillePage={25}
        columns={[
          { key: 'id', label: 'ID', render: (v) => <span style={STYLES.mono}>{String(v).substring(0, 8)}</span> },
          {
            key: 'boutiqueNom', label: 'Boutique', triable: true,
            render: (v) => v ?? <span style={{ color: COLORS.mutedLight }}>supprimée</span>,
          },
          {
            key: 'clientNom', label: 'Client', triable: true,
            render: (_v, row) => (
              row.clientEmail
                ? (
                  <span title={row.clientEmail}>
                    {row.clientNom || row.clientEmail}
                  </span>
                )
                : <span style={{ color: COLORS.mutedLight }}>supprimé</span>
            ),
          },
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
