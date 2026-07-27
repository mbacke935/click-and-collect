'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import DataTable from '../components/DataTable';

// Modération des catalogues : vue transverse de tous les produits (toutes boutiques),
// avec possibilité de retirer un produit inapproprié — cf. cas d'utilisation
// Administrateur "Modérer les catalogues et traiter les signalements". Le circuit de
// signalement des clients n'existe pas encore côté application mobile ; cette page
// couvre pour l'instant la partie modération directe du catalogue.
export default function ModerationPage() {
  const [produits, setProduits] = useState<any[]>([]);
  const [erreur, setErreur] = useState('');

  const charger = () => apiFetch('/admin/produits').then(setProduits).catch(() => setErreur('Impossible de charger le catalogue.'));
  useEffect(() => { charger(); }, []);

  const toggle = async (id: string, actif: boolean) => {
    await apiFetch(`/admin/produits/${id}/toggle?active=${actif}`, { method: 'PATCH' });
    charger();
  };

  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Modération des catalogues</h2>
      {erreur && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{erreur}</p>}
      <DataTable
        emptyMessage="Aucun produit à modérer."
        columns={[
          { key: 'nom', label: 'Produit' },
          { key: 'boutique', label: 'Boutique', render: (v) => v?.nom || '—' },
          { key: 'categorie', label: 'Catégorie' },
          { key: 'prix', label: 'Prix', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v?.toLocaleString()} FCFA</span> },
          { key: 'actif', label: 'Statut', render: (v, row) => (
            <button onClick={() => toggle(row.id, !v)} style={{
              padding: '4px 12px', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: 'none', textTransform: 'uppercase',
              backgroundColor: v ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: v ? '#4ADE80' : '#EF4444',
            }}>
              {v ? 'Visible' : 'Retiré'}
            </button>
          )},
        ]}
        data={produits}
      />
    </div>
  );
}
