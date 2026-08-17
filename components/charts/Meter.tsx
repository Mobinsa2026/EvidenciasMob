import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CHART_TRACK, ESTADO_COLOR, tonoPuntualidad } from './tokens';

const ICONO = {
  bueno: CheckCircle2,
  regular: AlertTriangle,
  malo: XCircle,
} as const;

const LEYENDA = {
  bueno: 'Al día',
  regular: 'Atención',
  malo: 'Crítico',
} as const;

/**
 * Medidor de puntualidad: una razón contra un límite.
 *
 * El color de estado nunca va solo — siempre lleva el porcentaje escrito y una
 * etiqueta con icono, para que se entienda sin distinguir colores.
 */
export function PunctualityMeter({
  pct,
  aTiempo,
  total,
  compacto,
}: {
  pct: number | null;
  aTiempo: number;
  total: number;
  compacto?: boolean;
}) {
  const tono = tonoPuntualidad(pct);
  const Icon = ICONO[tono];
  const color = ESTADO_COLOR[tono];

  if (pct === null) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-muted">Puntualidad</span>
          <span className="text-sm font-bold text-muted">Sin datos</span>
        </div>
        <div
          className="mt-2 h-2 w-full rounded-full"
          style={{ backgroundColor: CHART_TRACK }}
          aria-hidden
        />
        <p className="mt-1.5 text-[11px] text-muted">Aún no completa ninguna tarea.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted">Puntualidad</span>
        <span
          className={cn('font-extrabold tabular-nums text-ink', compacto ? 'text-lg' : 'text-2xl')}
        >
          {pct}%
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Puntualidad ${pct} por ciento`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: CHART_TRACK }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
        />
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        <Icon className="size-3.5 shrink-0" style={{ color }} aria-hidden />
        <span className="font-semibold" style={{ color }}>
          {LEYENDA[tono]}
        </span>
        · {aTiempo} de {total} dentro del plazo
      </p>
    </div>
  );
}
