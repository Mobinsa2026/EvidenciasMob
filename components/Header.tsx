'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, PackageCheck, Users } from 'lucide-react';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/registrar': { title: 'Nueva evidencia', subtitle: 'Registra la información de la entrega.' },
  '/historial': { title: 'Historial de entregas', subtitle: 'Consulta todas las evidencias registradas.' },
  '/empleados': { title: 'Empleados', subtitle: 'Administra quién puede realizar entregas.' },
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/';
  const page =
    TITLES[pathname] ??
    (pathname.startsWith('/evidencias/')
      ? { title: 'Evidencia de entrega', subtitle: 'Comprobante digital de la entrega.' }
      : null);

  return (
    <header className="gradient-brand text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
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

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/empleados"
            aria-label="Empleados"
            className="-mr-1.5 flex size-11 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/15 active:bg-white/25"
          >
            <Users className="size-[18px]" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
