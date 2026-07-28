'use client';

import { useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { COLORS, STYLES, pastilleStyle } from '../constants/theme';
import type { Boutique } from '../types';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import ToggleBadge from '../components/ToggleBadge';

export default function BoutiquesPage() {
  const { data, loading, erreur, recharger } = useApiData<Boutique[]>(() => adminApi.getBoutiques());
  const [recherche, setRecherche] = useState('');
  const [actionErreur, setActionErreur] = useState('');

  const boutiques = useMemo(() => data ?? [], [data]);

  const boutiquesAffichees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return boutiques;
    return boutiques.filter((b) =>
      [b.nom, b.categorie, b.adresse].some((champ) => champ?.toLowerCase().includes(terme)),
    );
  }, [boutiques, recherche]);

  const toggle = async (boutique: Boutique) => {
    setActionErreur('');
    try {
      await adminApi.toggleBoutique(boutique.id, !boutique.active);
      recharger();
    } catch (err) {
      setActionErreur((err as Error).message);
    }
  };

  const nbInactives = boutiques.filter((b) => !b.active).length;

  return (
    <div>
      <PageHeader
        titre="Boutiques"
        sousTitre={`${boutiques.length} boutique${boutiques.length > 1 ? 's' : ''} · ${nbInactives} suspendue(s)`}
        actions={<button onClick={recharger} style={STYLES.buttonSecondary}>Rafraîchir</button>}
      />

      <SearchInput
        label="Rechercher une boutique"
        placeholder="Nom, catégorie ou adresse…"
        valeur={recherche}
        onChange={setRecherche}
      />

      {actionErreur && <p style={{ ...STYLES.erreur, marginBottom: 14 }}>{actionErreur}</p>}

      <DataTable<Boutique>
        loading={loading}
        erreur={erreur}
        onReessayer={recharger}
        emptyMessage={recherche ? 'Aucune boutique ne correspond à cette recherche.' : 'Aucune boutique.'}
        data={boutiquesAffichees}
        taillePage={25}
        columns={[
          { key: 'nom', label: 'Nom', triable: true },
          { key: 'categorie', label: 'Catégorie', triable: true, render: (v) => <span style={pastilleStyle(COLORS.gold)}>{String(v)}</span> },
          { key: 'adresse', label: 'Adresse', triable: true },
          {
            key: 'active', label: 'Statut', triable: true,
            render: (_v, row) => (
              <ToggleBadge
                actif={row.active}
                onToggle={() => toggle(row)}
                labels={['Active', 'Inactive']}
                cible={`la boutique ${row.nom}`}
              />
            ),
          },
          { key: 'dateCreation', label: 'Création', triable: true, render: (v) => new Date(String(v)).toLocaleDateString('fr-FR') },
        ]}
      />
    </div>
  );
}
