import type { Metadata } from 'next';
import AdminLayout from '../layouts/AdminLayout';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Click & Collect — Admin',
  description: 'Tableau de bord administrateur Click & Collect',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif', backgroundColor: '#111', color: '#eee' }}>
        <AuthProvider>
          <AdminLayout>{children}</AdminLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
