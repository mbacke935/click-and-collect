'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de bord' },
  { href: '/utilisateurs', label: 'Utilisateurs' },
  { href: '/boutiques', label: 'Boutiques' },
  { href: '/commandes', label: 'Commandes' },
  { href: '/sync', label: 'Synchronisation' },
  { href: '/moderation', label: 'Modération' },
  { href: '/parametres', label: 'Paramètres' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, isAuthenticated, pathname]);

  if (pathname === '/login') return <>{children}</>;

  // Tant que la session n'a pas été vérifiée (ou si elle est invalide), on n'affiche pas
  // le contenu protégé — évite l'affichage furtif de données avant la redirection.
  if (loading || !isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111' }}>
      {/* Topbar */}
      <div style={{
        backgroundColor: '#111', borderBottom: '1px solid #9B7A2F',
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#D4A843', fontWeight: 700, fontSize: 16 }}>
          Click &amp; Collect — Administration
        </span>
        <button
          onClick={logout}
          style={{
            background: 'transparent', border: '1px solid #666', color: '#999',
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          Déconnexion
        </button>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <nav style={{
          width: 200, backgroundColor: '#1A1A1A', padding: '18px 0',
          borderRight: '1px solid #333', minHeight: 'calc(100vh - 50px)',
        }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'block', padding: '11px 22px', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', borderLeft: '3px solid transparent',
                  color: active ? '#D4A843' : '#999',
                  backgroundColor: active ? 'rgba(212,168,67,0.06)' : 'transparent',
                  borderLeftColor: active ? '#D4A843' : 'transparent',
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Main */}
        <main style={{ flex: 1, padding: 28, backgroundColor: '#1A1A1A' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
