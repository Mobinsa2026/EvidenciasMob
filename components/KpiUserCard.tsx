import { AlertTriangle, CheckCircle2, Clock, Package, Timer, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UserKpi } from '@/lib/types';
import { Card } from './ui/Card';

function minutos(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—';
  // Redondear a "0 min" haría ver como instantáneo algo que sí tomó tiempo.
  if (valor < 1) return '< 1 min';
  if (valor < 60) return `${Math.round(valor)} min`;
  const horas = Math.floor(valor / 60);
  const resto = Math.round(valor % 60);
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

export function KpiUserCard({ kpi }: { kpi: UserKpi }) {
  const pct = kpi.pct_a_tiempo;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
          {kpi.user_name
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{kpi.user_name}</p>
          <p className="text-xs text-muted">
            {kpi.asignadas} tarea{kpi.asignadas === 1 ? '' : 's'} asignada
            {kpi.asignadas === 1 ? '' : 's'}
          </p>
        </div>

        {pct !== null && (
          <span
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-bold',
              pct >= 90
                ? 'bg-success-soft text-success'
                : pct >= 70
                  ? 'bg-warn-soft text-warn'
                  : 'bg-danger-soft text-danger',
            )}
          >
            {pct}%
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metrica
          icon={CheckCircle2}
          label="Completadas"
          value={String(kpi.completadas)}
          tono="success"
        />
        <Metrica icon={Clock} label="En curso" value={String(kpi.en_curso)} />
        <Metrica
          icon={AlertTriangle}
          label="Fuera de plazo"
          value={String(kpi.vencidas)}
          tono={kpi.vencidas > 0 ? 'danger' : undefined}
        />
        <Metrica icon={Timer} label="Tiempo promedio" value={minutos(kpi.minutos_promedio)} />
        <Metrica
          icon={TrendingUp}
          label="Tarda en arrancar"
          value={minutos(kpi.minutos_respuesta)}
        />
        <Metrica
          icon={Package}
          label="Evidencias"
          value={String(kpi.entregas_totales)}
        />
      </div>

      {kpi.minutos_pausa_prom !== null && kpi.minutos_pausa_prom > 0 && (
        <p className="mt-3 text-xs text-muted">
          Promedio en pausa por tarea: <strong>{minutos(kpi.minutos_pausa_prom)}</strong>
        </p>
      )}
    </Card>
  );
}

function Metrica({
  icon: Icon,
  label,
  value,
  tono,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tono?: 'success' | 'danger';
}) {
  return (
    <div className="rounded-btn bg-canvas p-3">
      <Icon
        className={cn(
          'size-4',
          tono === 'success' ? 'text-success' : tono === 'danger' ? 'text-danger' : 'text-muted',
        )}
        aria-hidden
      />
      <p
        className={cn(
          'mt-1.5 text-lg font-extrabold tabular-nums leading-none',
          tono === 'danger' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}
