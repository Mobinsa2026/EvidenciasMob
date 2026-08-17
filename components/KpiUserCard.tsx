import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  Pause,
  ShieldCheck,
  Timer,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PersonaKpi } from '@/lib/assignments';
import { PunctualityMeter } from './charts/Meter';
import { Card } from './ui/Card';

/** `45 min`, `1 h 20 min`, `< 1 min` o guion si no hay dato. */
export function minutosLegibles(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—';
  if (valor < 1) return '< 1 min';
  if (valor < 60) return `${Math.round(valor)} min`;

  const horas = Math.floor(valor / 60);
  const resto = Math.round(valor % 60);
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

export function KpiUserCard({ kpi, posicion }: { kpi: PersonaKpi; posicion?: number }) {
  const sinActividad = kpi.asignadas === 0 && kpi.entregas === 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
          {iniciales(kpi.name)}
          {posicion === 1 && kpi.completadas > 0 && (
            <span
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white ring-2 ring-surface"
              title="Más entregas completadas del periodo"
            >
              1
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{kpi.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            {kpi.role === 'jefe' && <ShieldCheck className="size-3.5 text-brand" aria-hidden />}
            {kpi.role === 'jefe' ? 'Jefe' : 'Asistente'}
          </p>
        </div>

        {kpi.vencidas > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">
            <AlertTriangle className="size-3.5" aria-hidden />
            {kpi.vencidas} atrasada{kpi.vencidas === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {sinActividad ? (
        <p className="px-5 py-6 text-center text-sm text-muted">
          Sin actividad en este periodo.
        </p>
      ) : (
        <>
          <div className="px-5 py-4">
            <PunctualityMeter
              pct={kpi.pct_a_tiempo}
              aTiempo={kpi.a_tiempo}
              total={kpi.completadas}
            />
          </div>

          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            <Dato
              icon={CheckCircle2}
              label="Completadas"
              valor={String(kpi.completadas)}
              tono="bueno"
            />
            <Dato icon={Clock} label="Abiertas" valor={String(kpi.abiertas)} />
            <Dato
              icon={Timer}
              label="Tiempo promedio"
              valor={minutosLegibles(kpi.minutos_promedio)}
            />
            <Dato
              icon={Zap}
              label="Tarda en arrancar"
              valor={minutosLegibles(kpi.minutos_respuesta)}
            />
          </dl>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Package className="size-3.5" aria-hidden />
              {kpi.entregas} evidencia{kpi.entregas === 1 ? '' : 's'}
            </span>

            {kpi.minutos_pausa !== null && kpi.minutos_pausa >= 1 && (
              <span className="flex items-center gap-1.5">
                <Pause className="size-3.5" aria-hidden />
                {minutosLegibles(kpi.minutos_pausa)} en pausa por tarea
              </span>
            )}

            <Link
              href={`/tareas?estado=todas&persona=${kpi.id}`}
              className="ml-auto flex items-center gap-1 font-semibold text-brand transition-colors duration-200 hover:text-brand-2"
            >
              Ver sus tareas
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

function Dato({
  icon: Icon,
  label,
  valor,
  tono,
}: {
  icon: typeof Clock;
  label: string;
  valor: string;
  tono?: 'bueno';
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] leading-tight text-muted">
        <Icon
          className={cn('size-3.5 shrink-0', tono === 'bueno' ? 'text-success' : 'text-muted')}
          aria-hidden
        />
        {label}
      </dt>
      <dd className="mt-1 text-lg font-extrabold leading-none tabular-nums text-ink">
        {valor}
      </dd>
    </div>
  );
}
