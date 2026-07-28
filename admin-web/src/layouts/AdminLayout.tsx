'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

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
  const { loading, isAuthenticated, session, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (pathname === '/login') return <>{children}</>;

  // Tant que la session n'a pas été vérifiée (ou si elle est invalide), on n'affiche pas
  // le contenu protégé — évite l'affichage furtif de données avant la redirection.
  if (loading || !isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.black }}>
      {/* Topbar */}
      <div style={{
        backgroundColor: COLORS.black, borderBottom: `1px solid ${COLORS.goldDark}`,
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 16 }}>
          Click &amp; Collect — Administration
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>{session?.email}</span>
          <button
            onClick={logout}
            style={{
              background: 'transparent', border: `1px solid ${COLORS.mutedLight}`, color: COLORS.muted,
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar — next/link préserve la navigation SPA, là où un <a href> rechargeait
            entièrement le document à chaque changement de page. */}
        <nav aria-label="Navigation principale" style={{
          width: 200, flexShrink: 0, backgroundColor: COLORS.blackSoft, padding: '18px 0',
          borderRight: `1px solid ${COLORS.line}`, minHeight: 'calc(100vh - 50px)',
        }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'block', padding: '11px 22px', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', borderLeft: '3px solid transparent',
                  color: active ? COLORS.gold : COLORS.muted,
                  backgroundColor: active ? 'rgba(212,168,67,0.06)' : 'transparent',
                  borderLeftColor: active ? COLORS.gold : 'transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main style={{ flex: 1, minWidth: 0, padding: 28, backgroundColor: COLORS.blackSoft }}>
          {children}
        </main>
      </div>
    </div>
  );
}
