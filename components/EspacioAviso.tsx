import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { AVISO_ATENCION, AVISO_CRITICO, getEspacioPct } from '@/lib/espacio';

/**
 * Aviso de espacio para el jefe.
 *
 * El plan gratuito de Supabase no manda ninguna alerta antes de llenarse: un
 * día simplemente dejan de subirse las fotografías. Este banner aparece con
 * semanas de anticipación para que dé tiempo de descargar el respaldo.
 *
 * Solo se pinta a partir del 70%: por debajo de eso sería ruido en todas las
 * pantallas de la app.
 */
export async function EspacioAviso() {
  const pct = await getEspacioPct().catch(() => null);
  if (pct === null || pct < AVISO_ATENCION) return null;

  const critico = pct >= AVISO_CRITICO;

  return (
    <div
      className={
        critico
          ? 'border-b border-danger/30 bg-danger-soft'
          : 'border-b border-warn/30 bg-warn-soft'
      }
    >
      <Link
        href="/almacenamiento"
        className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-2.5 sm:px-6"
      >
        <TriangleAlert
          className={critico ? 'size-4 shrink-0 text-danger' : 'size-4 shrink-0 text-warn'}
          aria-hidden
        />

        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-ink">
          Almacenamiento al {pct}%.{' '}
          <span className="font-normal text-muted">
            {critico
              ? 'Descarga el respaldo y libera espacio ya.'
              : 'Conviene descargar el respaldo del mes.'}
          </span>
        </p>

        <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </div>
  );
}
