'use client';

export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      backgroundColor: '#222', borderRadius: 6, padding: 18,
      borderLeft: '4px solid #D4A843',
    }}>
      <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#D4A843', fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  );
}
