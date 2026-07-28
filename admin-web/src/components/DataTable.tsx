'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { COLORS } from '../constants/theme';

export interface Column<T> {
  key: keyof T & string;
  label: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
  /** Rend l'en-tête cliquable pour trier sur la valeur brute de cette colonne. */
  triable?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  /** Identifiant stable de ligne. Par défaut `row.id` s'il existe, sinon l'index. */
  rowKey?: (row: T, index: number) => string;
  loading?: boolean;
  erreur?: string;
  onReessayer?: () => void;
  emptyMessage?: string;
  /** Met en évidence la ligne concernée par l'action en cours (ex. celle en édition). */
  ligneActive?: (row: T) => boolean;
  /** Nombre de lignes par page. Omis, le tableau affiche tout sans pagination. */
  taillePage?: number;
}

type Sens = 'asc' | 'desc';

const cellulePleineLargeur: React.CSSProperties = {
  padding: 30,
  textAlign: 'center',
  color: COLORS.mutedLight,
  fontSize: 13,
};

// Comparaison générique sur la valeur brute : les nombres se comparent numériquement,
// les booléens placent `false` en premier, et les dates ISO se comparent correctement
// en tant que chaînes. Les valeurs absentes sont renvoyées en fin de liste, quel que
// soit le sens du tri, pour qu'un champ vide ne parasite jamais la lecture.
function comparer(a: unknown, b: unknown): number {
  const aVide = a === null || a === undefined || a === '';
  const bVide = b === null || b === undefined || b === '';
  if (aVide && bVide) return 0;
  if (aVide) return 1;
  if (bVide) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, rowKey, loading = false, erreur = '', onReessayer,
  emptyMessage = 'Aucune donnée.', ligneActive, taillePage,
}: Props<T>) {
  const cleLigne = rowKey ?? ((row: T, index: number) => String(row.id ?? index));

  const [tri, setTri] = useState<{ colonne: string; sens: Sens } | null>(null);
  const [page, setPage] = useState(1);

  const donneesTriees = useMemo(() => {
    if (!tri) return data;
    const copie = [...data];
    copie.sort((a, b) => {
      const ordre = comparer(a[tri.colonne], b[tri.colonne]);
      return tri.sens === 'asc' ? ordre : -ordre;
    });
    return copie;
  }, [data, tri]);

  const nbPages = taillePage ? Math.max(1, Math.ceil(donneesTriees.length / taillePage)) : 1;

  // Un changement de filtre ou de recherche peut réduire la liste sous la page courante :
  // sans ce recadrage, le tableau afficherait une page vide sans explication.
  useEffect(() => {
    setPage((courante) => Math.min(courante, nbPages));
  }, [nbPages]);

  const donneesAffichees = useMemo(() => {
    if (!taillePage) return donneesTriees;
    const debut = (page - 1) * taillePage;
    return donneesTriees.slice(debut, debut + taillePage);
  }, [donneesTriees, page, taillePage]);

  const basculerTri = (colonne: string) => {
    setTri((courant) => {
      if (courant?.colonne !== colonne) return { colonne, sens: 'asc' };
      // Troisième clic : retour à l'ordre d'origine renvoyé par l'API.
      if (courant.sens === 'asc') return { colonne, sens: 'desc' };
      return null;
    });
    setPage(1);
  };

  // Chargement, erreur et vide sont trois états distincts : les confondre laissait
  // croire à une absence de données alors que la requête avait échoué.
  const corps = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={columns.length} style={cellulePleineLargeur}>
            Chargement…
          </td>
        </tr>
      );
    }
    if (erreur) {
      return (
        <tr>
          <td colSpan={columns.length} style={{ ...cellulePleineLargeur, color: COLORS.red }}>
            {erreur}
            {onReessayer && (
              <button
                onClick={onReessayer}
                style={{
                  marginLeft: 12, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                  background: 'transparent', borderWidth: 1, borderStyle: 'solid',
                  borderColor: COLORS.red, color: COLORS.red, borderRadius: 3,
                }}
              >
                Réessayer
              </button>
            )}
          </td>
        </tr>
      );
    }
    if (donneesAffichees.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} style={cellulePleineLargeur}>{emptyMessage}</td>
        </tr>
      );
    }
    return donneesAffichees.map((row, i) => {
      const active = ligneActive?.(row) ?? false;
      return (
        <tr
          key={cleLigne(row, i)}
          aria-selected={active || undefined}
          style={{
            borderBottom: `1px solid ${COLORS.line}`,
            backgroundColor: active ? 'rgba(212,168,67,0.10)' : undefined,
            boxShadow: active ? `inset 3px 0 0 ${COLORS.gold}` : undefined,
          }}
        >
          {columns.map((col) => (
            <td key={col.key} style={{ padding: '11px 12px', color: COLORS.white }}>
              {col.render ? col.render(row[col.key], row) : (row[col.key] as ReactNode)}
            </td>
          ))}
        </tr>
      );
    });
  };

  const styleBoutonPage: React.CSSProperties = {
    padding: '5px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 3,
    background: 'transparent', borderWidth: 1, borderStyle: 'solid',
    borderColor: COLORS.mutedLight, color: COLORS.muted,
  };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const trieSurCetteColonne = tri?.colonne === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={trieSurCetteColonne ? (tri!.sens === 'asc' ? 'ascending' : 'descending') : undefined}
                    style={{
                      textAlign: 'left', color: trieSurCetteColonne ? COLORS.gold : COLORS.muted,
                      fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                      padding: 0, whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${COLORS.goldDark}`,
                    }}
                  >
                    {col.triable ? (
                      <button
                        onClick={() => basculerTri(col.key)}
                        aria-label={`Trier par ${col.label}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '10px 12px', width: '100%', font: 'inherit',
                          color: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {col.label}
                        <span aria-hidden="true" style={{ opacity: trieSurCetteColonne ? 1 : 0.35 }}>
                          {trieSurCetteColonne ? (tri!.sens === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '10px 12px' }}>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{corps()}</tbody>
        </table>
      </div>

      {taillePage && !loading && !erreur && donneesTriees.length > taillePage && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginTop: 14, flexWrap: 'wrap',
        }}>
          <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>
            {(page - 1) * taillePage + 1}–{Math.min(page * taillePage, donneesTriees.length)} sur {donneesTriees.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...styleBoutonPage, opacity: page === 1 ? 0.4 : 1 }}
            >
              Précédent
            </button>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>Page {page} / {nbPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(nbPages, p + 1))}
              disabled={page === nbPages}
              style={{ ...styleBoutonPage, opacity: page === nbPages ? 0.4 : 1 }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
