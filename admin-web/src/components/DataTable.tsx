'use client';

import type { ReactNode } from 'react';
import { COLORS } from '../constants/theme';

export interface Column<T> {
  key: keyof T & string;
  label: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
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
}

const cellulePleineLargeur: React.CSSProperties = {
  padding: 30,
  textAlign: 'center',
  color: COLORS.mutedLight,
  fontSize: 13,
};

export default function DataTable<T extends Record<string, any>>({
  columns, data, rowKey, loading = false, erreur = '', onReessayer,
  emptyMessage = 'Aucune donnée.', ligneActive,
}: Props<T>) {
  const cleLigne = rowKey ?? ((row: T, index: number) => String(row.id ?? index));

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
                  background: 'transparent', border: `1px solid ${COLORS.red}`,
                  color: COLORS.red, borderRadius: 3,
                }}
              >
                Réessayer
              </button>
            )}
          </td>
        </tr>
      );
    }
    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} style={cellulePleineLargeur}>{emptyMessage}</td>
        </tr>
      );
    }
    return data.map((row, i) => {
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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{
                textAlign: 'left', color: COLORS.muted, fontWeight: 600, fontSize: 11,
                textTransform: 'uppercase', padding: '10px 12px', whiteSpace: 'nowrap',
                borderBottom: `1px solid ${COLORS.goldDark}`,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{corps()}</tbody>
      </table>
    </div>
  );
}
