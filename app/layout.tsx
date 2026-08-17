import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { BottomNavigation, DesktopNavigation } from '@/components/BottomNavigation';
import { SessionProvider } from '@/components/SessionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { getSessionUser } from '@/lib/auth';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Evidencias';

export const metadata: Metadata = {
  title: {
    default: `${appName} · Control de Entregas`,
    template: `%s · ${appName}`,
  },
  description:
    'Registra y consulta las evidencias de órdenes de trabajo y facturas entregadas.',
  applicationName: appName,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#37277E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sin sesión solo se llega a /login, que se muestra sin la interfaz de la app.
  const user = await getSessionUser().catch(() => null);

  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-dvh">
        <ToastProvider>
          {user ? (
            <SessionProvider user={user}>
              {/* El dock de escritorio va en absoluto sobre el borde del
                  encabezado, así que no suma altura al bloque fijo. */}
              <div className="sticky top-0 z-50">
                <Header user={user} />
                <DesktopNavigation role={user.role} />
              </div>

              {/* Espacio extra para que ningún dock tape el contenido. */}
              <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 sm:px-6 md:pb-16 md:pt-24">
                {children}
              </main>

              <BottomNavigation role={user.role} />
            </SessionProvider>
          ) : (
            children
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
