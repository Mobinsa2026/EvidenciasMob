import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import { KpiPeriodo } from '@/components/KpiPeriodo';
import { KpiUserCard } from '@/components/KpiUserCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getKpis } from '@/lib/assignments';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Desempeño' };
export const dynamic = 'force-dynamic';

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const dias = Number(params.dias ?? 30);
  const periodo = [7, 30, 90].includes(dias) ? dias : 30;

  const todos = await getKpis(periodo).catch(() => []);
  const esJefe = user.role === 'jefe';

  // El asistente solo se ve a sí mismo.
  const kpis = esJefe ? todos : todos.filter((kpi) => kpi.user_id === user.id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">
          {esJefe ? 'Desempeño del equipo' : 'Mi avance'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {esJefe
            ? 'Cómo va cada persona con las entregas asignadas.'
            : 'Tus tiempos y cumplimiento de plazos.'}
        </p>
      </header>

      <KpiPeriodo periodo={periodo} />

      {kpis.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-7" aria-hidden />}
          title="Todavía no hay datos"
          description="Los indicadores aparecerán cuando se asignen y completen entregas."
        />
      ) : (
        <div className="space-y-4">
          {kpis.map((kpi) => (
            <KpiUserCard key={kpi.user_id} kpi={kpi} />
          ))}
        </div>
      )}

      <p className="px-1 text-xs leading-relaxed text-muted">
        El <strong>tiempo promedio</strong> descuenta las pausas: mide trabajo real, no reloj
        de pared. Una tarea cuenta como <strong>a tiempo</strong> si se completó antes de que
        se agotara su plazo.
      </p>
    </div>
  );
}
