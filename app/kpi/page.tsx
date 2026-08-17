import type { Metadata } from 'next';
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Timer,
} from 'lucide-react';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { PersonBars } from '@/components/charts/PersonBars';
import { PunctualityMeter } from '@/components/charts/Meter';
import { KpiPeriodo } from '@/components/KpiPeriodo';
import { KpiUserCard, minutosLegibles } from '@/components/KpiUserCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getTeamOverview } from '@/lib/assignments';
import { requireUser } from '@/lib/auth';
import { formatShortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Desempeño' };
export const dynamic = 'force-dynamic';

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const solicitados = Number(params.dias ?? 30);
  const periodo = [7, 30, 90].includes(solicitados) ? solicitados : 30;

  const esJefe = user.role === 'jefe';
  const panel = await getTeamOverview(periodo).catch(() => null);

  if (!panel) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-7" aria-hidden />}
        title="No se pudo cargar el desempeño"
        description="Revisa la conexión con la base de datos e inténtalo de nuevo."
      />
    );
  }

  // El asistente solo se ve a sí mismo.
  const personas = esJefe
    ? panel.personas
    : panel.personas.filter((persona) => persona.id === user.id);

  const ranking = [...personas].sort((a, b) => b.completadas - a.completadas);
  const total = esJefe ? panel.total : null;
  const propio = personas[0];

  const sinDatos = personas.every((p) => p.asignadas === 0 && p.entregas === 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">
          {esJefe ? 'Desempeño del equipo' : 'Mi avance'}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <CalendarRange className="size-4 shrink-0" aria-hidden />
          Del {formatShortDate(panel.desde)} a hoy
        </p>
      </header>

      <KpiPeriodo periodo={periodo} />

      {sinDatos ? (
        <EmptyState
          icon={<BarChart3 className="size-7" aria-hidden />}
          title="Todavía no hay datos"
          description="Los indicadores aparecerán cuando se asignen y completen entregas."
        />
      ) : (
        <>
          {/* ── Resumen del periodo ─────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              icon={CheckCircle2}
              label="Completadas"
              valor={String((total ?? propio).completadas)}
              nota={`de ${(total ?? propio).asignadas} asignadas`}
            />
            <Tile
              icon={Timer}
              label="Tiempo promedio"
              valor={minutosLegibles(
                total ? total.minutos_promedio : propio.minutos_promedio,
              )}
              nota="sin contar pausas"
            />
            <Tile
              icon={ClipboardList}
              label="Abiertas ahora"
              valor={String((total ?? propio).abiertas)}
              nota="sin completar"
            />
            <Tile
              icon={AlertTriangle}
              label="Fuera de plazo"
              valor={String((total ?? propio).vencidas)}
              nota="abiertas y atrasadas"
              alerta={(total ?? propio).vencidas > 0}
            />
          </section>

          {/* ── Puntualidad general ─────────────────────────────────────── */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">
              {esJefe ? 'Puntualidad del equipo' : 'Tu puntualidad'}
            </h2>
            <p className="mb-4 mt-0.5 text-xs leading-relaxed text-muted">
              Proporción de entregas terminadas antes de que se agotara su plazo.
            </p>

            <PunctualityMeter
              pct={(total ?? propio).pct_a_tiempo}
              aTiempo={(total ?? propio).a_tiempo}
              total={(total ?? propio).completadas}
            />
          </Card>

          {/* ── Actividad en el tiempo ──────────────────────────────────── */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">Entregas completadas</h2>
            <p className="mb-4 mt-0.5 text-xs text-muted">
              Ritmo de trabajo durante el periodo.
            </p>

            <ActivityChart serie={panel.serie} porSemana={panel.porSemana} />
          </Card>

          {/* ── Comparación entre personas (solo el jefe) ───────────────── */}
          {esJefe && personas.length > 1 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-ink">Carga por persona</h2>
              <p className="mb-4 mt-0.5 text-xs text-muted">
                Entregas completadas en el periodo.
              </p>

              <PersonBars
                etiqueta="entregas completadas"
                datos={ranking.map((persona) => ({
                  id: persona.id,
                  name: persona.name,
                  valor: persona.completadas,
                }))}
              />
            </Card>
          )}

          {/* ── Detalle por persona ─────────────────────────────────────── */}
          <section className="space-y-4">
            {esJefe && (
              <h2 className="text-lg font-bold tracking-tight text-ink">Detalle por persona</h2>
            )}

            {ranking.map((persona, indice) => (
              <KpiUserCard
                key={persona.id}
                kpi={persona}
                posicion={esJefe ? indice + 1 : undefined}
              />
            ))}
          </section>

          {/* ── Vista de tabla: los mismos datos sin depender del color ── */}
          {esJefe && (
            <Card className="overflow-hidden">
              <h2 className="px-5 pb-1 pt-4 text-sm font-bold text-ink">Resumen en tabla</h2>
              <p className="px-5 pb-3 text-xs text-muted">
                Los mismos indicadores, en texto.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-line bg-canvas">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      <th className="px-4 py-2.5">Persona</th>
                      <th className="px-4 py-2.5 text-right">Compl.</th>
                      <th className="px-4 py-2.5 text-right">A tiempo</th>
                      <th className="px-4 py-2.5 text-right">Tarde</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right">Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ranking.map((persona) => (
                      <tr key={persona.id}>
                        <td className="max-w-40 truncate px-4 py-2.5 font-medium text-ink">
                          {persona.name}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                          {persona.completadas}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                          {persona.a_tiempo}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                          {persona.tarde}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted">
                          {minutosLegibles(persona.minutos_promedio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <p className="px-1 pb-2 text-xs leading-relaxed text-muted">
        El <strong className="font-semibold text-ink">tiempo promedio</strong> descuenta las
        pausas: mide trabajo real, no reloj de pared. Una tarea cuenta como{' '}
        <strong className="font-semibold text-ink">a tiempo</strong> si se completó antes de
        agotar su plazo. Las tareas vencidas se pueden entregar igual; solo quedan marcadas
        como fuera de plazo.
      </p>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  valor,
  nota,
  alerta,
}: {
  icon: typeof CheckCircle2;
  label: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <Card className={alerta ? 'border-danger/30 p-4' : 'p-4'}>
      <div className="flex items-center gap-1.5">
        <Icon
          className={alerta ? 'size-4 shrink-0 text-danger' : 'size-4 shrink-0 text-muted'}
          aria-hidden
        />
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      </div>

      <p
        className={
          alerta
            ? 'mt-2 text-3xl font-extrabold leading-none tabular-nums text-danger'
            : 'mt-2 text-3xl font-extrabold leading-none tabular-nums text-ink'
        }
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[11px] leading-tight text-muted">{nota}</p>
    </Card>
  );
}
