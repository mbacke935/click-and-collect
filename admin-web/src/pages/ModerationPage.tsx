'use client';

export default function ModerationPage() {
  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Modération</h2>
      <div style={{
        backgroundColor: '#222', borderRadius: 6, padding: 40, textAlign: 'center',
        border: '1px solid #333',
      }}>
        <p style={{ color: '#999', fontSize: 14 }}>
          Aucun signalement en attente de modération.
        </p>
      </div>
    </div>
  );
}
