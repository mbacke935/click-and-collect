'use client';

import { useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { COLORS, STYLES, pastilleStyle } from '../constants/theme';
import type { Produit } from '../types';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import ToggleBadge from '../components/ToggleBadge';

// Modération des catalogues : vue transverse de tous les produits (toutes boutiques),
// avec possibilité de retirer un produit inapproprié — cf. cas d'utilisation
// Administrateur « Modérer les catalogues et traiter les signalements ». Le circuit de
// signalement des clients n'existe pas encore côté application mobile ; cette page
// couvre pour l'instant la partie modération directe du catalogue.
export default function ModerationPage() {
  const { data, loading, erreur, recharger } = useApiData<Produit[]>(() => adminApi.getProduits());
  const [recherche, setRecherche] = useState('');
  const [masquerRetires, setMasquerRetires] = useState(false);
  const [actionErreur, setActionErreur] = useState('');

  const produits = useMemo(() => data ?? [], [data]);

  const produitsAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return produits.filter((p) => {
      if (masquerRetires && !p.actif) return false;
      if (!terme) return true;
      return [p.nom, p.categorie, p.boutique?.nom].some((champ) => champ?.toLowerCase().includes(terme));
    });
  }, [produits, recherche, masquerRetires]);

  const toggle = async (produit: Produit) => {
    setActionErreur('');
    try {
      await adminApi.toggleProduit(produit.id, !produit.actif);
      recharger();
    } catch (err) {
      setActionErreur((err as Error).message);
    }
  };

  const nbRetires = produits.filter((p) => !p.actif).length;

  return (
    <div>
      <PageHeader
        titre="Modération des catalogues"
        sousTitre={`${produits.length} produit${produits.length > 1 ? 's' : ''} · ${nbRetires} retiré(s)`}
        actions={<button onClick={recharger} style={STYLES.buttonSecondary}>Rafraîchir</button>}
      />

      <SearchInput
        label="Rechercher un produit"
        placeholder="Produit, catégorie ou boutique…"
        valeur={recherche}
        onChange={setRecherche}
      />

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, color: COLORS.muted,
        fontSize: 13, marginBottom: 16, cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={masquerRetires}
          onChange={(e) => setMasquerRetires(e.target.checked)}
        />
        Masquer les produits déjà retirés
      </label>

      {actionErreur && <p style={{ ...STYLES.erreur, marginBottom: 14 }}>{actionErreur}</p>}

      <DataTable<Produit>
        loading={loading}
        erreur={erreur}
        onReessayer={recharger}
        emptyMessage={recherche || masquerRetires ? 'Aucun produit ne correspond à ces critères.' : 'Aucun produit à modérer.'}
        data={produitsAffiches}
        taillePage={25}
        columns={[
          { key: 'nom', label: 'Produit', triable: true },
          { key: 'boutique', label: 'Boutique', render: (_v, row) => row.boutique?.nom ?? '—' },
          {
            key: 'categorie', label: 'Catégorie', triable: true,
            render: (v) => (v ? <span style={pastilleStyle(COLORS.gold)}>{String(v)}</span> : '—'),
          },
          {
            key: 'prix', label: 'Prix', triable: true,
            render: (v) => <span style={STYLES.mono}>{Number(v).toLocaleString('fr-FR')} FCFA</span>,
          },
          {
            key: 'actif', label: 'Statut', triable: true,
            render: (_v, row) => (
              <ToggleBadge
                actif={row.actif}
                onToggle={() => toggle(row)}
                labels={['Visible', 'Retiré']}
                cible={`le produit ${row.nom}`}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
