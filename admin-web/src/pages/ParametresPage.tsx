'use client';

export default function ParametresPage() {
  return (
    <div>
      <h2 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Paramètres</h2>
      <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333', marginBottom: 16 }}>
        <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Plateforme</h3>
        <p style={{ color: '#999', fontSize: 13 }}>Nom : Click &amp; Collect</p>
        <p style={{ color: '#999', fontSize: 13 }}>Version : 1.0.0</p>
        <p style={{ color: '#999', fontSize: 13 }}>Devise : FCFA</p>
      </div>
      <div style={{ backgroundColor: '#222', borderRadius: 6, padding: 20, border: '1px solid #333' }}>
        <h3 style={{ color: '#eee', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Base de données</h3>
        <p style={{ color: '#999', fontSize: 13 }}>PostgreSQL · connectée</p>
        <p style={{ color: '#999', fontSize: 13 }}>Synchronize : activé (dev uniquement)</p>
      </div>
    </div>
  );
}
