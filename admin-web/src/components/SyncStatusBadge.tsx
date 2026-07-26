'use client';

const CONFIG: Record<string, { color: string; label: string }> = {
  synced: { color: '#D4A843', label: 'Synchronisé' },
  pending: { color: '#F59E0B', label: 'En attente' },
  failed: { color: '#EF4444', label: 'Échoué' },
};

export default function SyncStatusBadge({ statut }: { statut: string }) {
  const c = CONFIG[statut] || CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600, color: c.color,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: c.color, display: 'inline-block',
      }} />
      {c.label}
    </span>
  );
}
