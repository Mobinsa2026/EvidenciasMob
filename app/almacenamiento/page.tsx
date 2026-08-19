import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Archive,
  Database,
  HardDrive,
  Info,
  Package,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { PeriodoAcciones } from '@/components/PeriodoAcciones';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireUser } from '@/lib/auth';
import {
  AVISO_ATENCION,
  AVISO_CRITICO,
  LIMITE_DB,
  PERIODO_TAREAS,
  getEspacio,
} from '@/lib/espacio';
import { formatNumericDate } from '@/lib/format';
import { formatBytes } from '@/lib/image';

export const metadata: Metadata = { title: 'Almacenamiento' };
export const dynamic = 'force-dynamic';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-08` → `Agosto 2026`. */
function etiquetaPeriodo(periodo: string): string {
  if (periodo === PERIODO_TAREAS) return 'Fotografías de pausa';
  if (!/^\d{4}-\d{2}$/.test(periodo)) return 'Otros archivos';

  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1] ?? mes;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

function tono(pct: number): { color: string; fondo: string; texto: string } {
  if (pct >= AVISO_CRITICO) {
    return { color: 'var(--color-danger)', fondo: 'bg-danger-soft', texto: 'text-danger' };
  }
  if (pct >= AVISO_ATENCION) {
    return { color: 'var(--color-warn)', fondo: 'bg-warn-soft', texto: 'text-warn' };
  }
  return { color: 'var(--color-success)', fondo: 'bg-success-soft', texto: 'text-success' };
}

export default async function AlmacenamientoPage() {
  const user = await requireUser();
  if (user.role !== 'jefe') redirect('/');

  const espacio = await getEspacio().catch(() => null);

  if (!espacio) {
    return (
      <EmptyState
        icon={<HardDrive className="size-7" aria-hidden />}
        title="No se pudo leer el almacenamiento"
        description="Falta correr migration-003-espacio.sql en Supabase, o la conexión con la base falló."
      />
    );
  }

  const estado = tono(espacio.pct);
  const meses = espacio.periodos.filter((p) => /^\d{4}-\d{2}$/.test(p.periodo));
  const otros = espacio.periodos.filter((p) => !/^\d{4}-\d{2}$/.test(p.periodo));

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">Almacenamiento</h1>
        <p className="mt-1 text-sm text-muted">
          Cuánto espacio queda del plan gratuito y cómo respaldar antes de que se llene.
        </p>
      </header>

      {/* ── Uso actual ──────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <HardDrive className="size-3.5" aria-hidden />
              Fotografías y firmas
            </p>
            <p className="mt-1.5 text-3xl font-extrabold leading-none tabular-nums text-ink">
              {formatBytes(espacio.bytes)}
              <span className="ml-1.5 text-base font-semibold text-muted">
                de {formatBytes(espacio.limite)}
              </span>
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${estado.fondo} ${estado.texto}`}
          >
            {espacio.pct}%
          </span>
        </div>

        <div
          role="meter"
          aria-valuenow={espacio.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Almacenamiento usado: ${espacio.pct} por ciento`}
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-canvas"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.max(espacio.pct, 1)}%`,
              backgroundColor: estado.color,
            }}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Dato
            icon={TrendingUp}
            label="Se llena en"
            valor={
              espacio.diasRestantes === null
                ? 'Sin ritmo aún'
                : `${espacio.diasRestantes} días`
            }
            nota={
              espacio.diasRestantes === null
                ? 'hacen falta entregas para calcularlo'
                : 'al ritmo de los últimos 30 días'
            }
          />
          <Dato
            icon={Package}
            label="Caben todavía"
            valor={
              espacio.entregasRestantes === null
                ? '—'
                : `${espacio.entregasRestantes.toLocaleString('es-MX')}`
            }
            nota={
              espacio.bytesPorEntrega
                ? `entregas de ~${formatBytes(espacio.bytesPorEntrega)}`
                : 'entregas'
            }
          />
          <Dato
            icon={Database}
            label="Base de datos"
            valor={formatBytes(espacio.dbBytes)}
            nota={`${espacio.dbPct}% de ${formatBytes(LIMITE_DB)} · sin riesgo`}
          />
        </dl>
      </Card>

      {/* ── Meses ───────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <Archive className="size-[18px] text-brand" aria-hidden />
            Respaldo por mes
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            El plan gratuito no hace copias automáticas. Descarga el respaldo cada mes y
            guárdalo en OneDrive: es lo que permite recuperar las fotografías si algo pasa.
          </p>
        </div>

        {meses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Todavía no hay entregas registradas.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {meses.map((periodo) => (
              <li
                key={periodo.periodo}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">
                    {etiquetaPeriodo(periodo.periodo)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {periodo.entregas} entrega{periodo.entregas === 1 ? '' : 's'} ·{' '}
                    {periodo.archivado ? 'sin archivos' : formatBytes(periodo.bytes)}
                    {periodo.respaldadoEn && !periodo.archivado && (
                      <>
                        {' · '}
                        <span className="font-semibold text-success">
                          respaldado {formatNumericDate(periodo.respaldadoEn)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <PeriodoAcciones
                  periodo={periodo.periodo}
                  etiqueta={etiquetaPeriodo(periodo.periodo)}
                  entregas={periodo.entregas ?? 0}
                  bytes={formatBytes(periodo.bytes)}
                  respaldadoEn={
                    periodo.respaldadoEn ? formatNumericDate(periodo.respaldadoEn) : null
                  }
                  archivado={periodo.archivado}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Fotos de pausa y otros ──────────────────────────────────────── */}
      {otros.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Otros archivos</h2>
          <p className="mb-3 mt-0.5 text-xs leading-relaxed text-muted">
            Las fotografías que se toman al pausar una tarea. Se borran solas cuando se
            libera el espacio de un mes anterior, junto con las tareas ya cerradas.
          </p>

          <ul className="space-y-2">
            {otros.map((periodo) => (
              <li
                key={periodo.periodo}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-ink">
                  {etiquetaPeriodo(periodo.periodo)}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {periodo.archivos} archivo{periodo.archivos === 1 ? '' : 's'} ·{' '}
                  {formatBytes(periodo.bytes)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Cómo funciona ───────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Info className="size-4 text-brand" aria-hidden />
          Cómo se cuida el espacio
        </h2>

        <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted">
          <li className="flex gap-2">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
            Cada fotografía se reduce a 1280 px antes de subirse, y se guarda además una
            miniatura para la galería. Así entra casi el triple de entregas en el mismo
            espacio y abrir una evidencia consume mucho menos datos.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
            No se puede liberar el espacio de un mes sin haber descargado antes su
            respaldo. Es la regla que evita perder evidencia por accidente.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
            Al liberar un mes, la entrega no se borra: siguen su folio, cliente, fecha y
            responsable en el historial. Solo las imágenes pasan al respaldo.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Dato({
  icon: Icon,
  label,
  valor,
  nota,
}: {
  icon: typeof TrendingUp;
  label: string;
  valor: string;
  nota: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-lg font-extrabold leading-tight tabular-nums text-ink">
        {valor}
      </dd>
      <p className="mt-0.5 text-[11px] leading-tight text-muted">{nota}</p>
    </div>
  );
}
