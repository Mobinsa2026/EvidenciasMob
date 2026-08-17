'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/registrar': {
    title: 'Nueva evidencia',
    subtitle: 'Registra la información de la entrega.',
  },
  '/historial': {
    title: 'Historial de entregas',
    subtitle: 'Consulta todas las evidencias registradas.',
  },
  '/empleados': {
    title: 'Empleados',
    subtitle: 'Administra quién puede realizar entregas.',
  },
  '/tareas': { title: 'Tareas', subtitle: 'Entregas asignadas y su avance.' },
  '/tareas/nueva': { title: 'Asignar entrega', subtitle: 'Crea la tarea y define el plazo.' },
  '/kpi': { title: 'Desempeño', subtitle: 'Indicadores por persona.' },
  '/notificaciones': { title: 'Notificaciones', subtitle: 'Tus avisos recientes.' },
  '/cuenta': { title: 'Mi cuenta', subtitle: 'Datos de acceso y contraseña.' },
};

export function Header({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/';
  const page =
    TITLES[pathname] ??
    (pathname.startsWith('/evidencias/')
      ? { title: 'Evidencia de entrega', subtitle: 'Comprobante digital de la entrega.' }
      : pathname.startsWith('/tareas/')
        ? { title: 'Detalle de la tarea', subtitle: 'Cronómetro, evidencia y bitácora.' }
        : null);

  return (
    <header className="gradient-brand text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4 sm:gap-3 sm:px-6">
        {!isHome && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Regresar"
            className="-ml-1.5 flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/15 active:bg-white/25"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        )}

        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <PackageCheck className="size-[22px]" aria-hidden />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-[17px] font-bold leading-tight tracking-tight">
              {page ? page.title : 'Evidencias'}
            </span>
            <span className="block truncate text-xs leading-tight text-white/70">
              {page ? page.subtitle : 'Control de Entregas'}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <NotificationBell />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
