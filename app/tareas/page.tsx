import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { AssignmentCard } from '@/components/AssignmentCard';
import { AssignmentFilters } from '@/components/AssignmentFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { listAssignments } from '@/lib/assignments';
import { requireUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const metadata: Metadata = { title: 'Tareas' };
export const dynamic = 'force-dynamic';

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; persona?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const estado = params.estado ?? 'abiertas';
  const persona = params.persona ?? 'todos';

  const esJefe = user.role === 'jefe';

  const [assignments, personas] = await Promise.all([
    listAssignments({
      assignedTo: esJefe ? (persona === 'todos' ? undefined : persona) : user.id,
      status: estado,
    }),
    esJefe
      ? getSupabaseAdmin()
          .from('app_users')
          .select('id, name')
          .eq('active', true)
          .order('name')
          .then(({ data }) => (data ?? []) as Array<{ id: string; name: string }>)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand">
            {esJefe ? 'Tareas del equipo' : 'Mis tareas'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {esJefe
              ? 'Entregas asignadas y cómo van de tiempo.'
              : 'Las entregas que te tocan y su plazo.'}
          </p>
        </div>

        {esJefe && (
          <Link
            href="/tareas/nueva"
            className="flex h-11 items-center gap-2 rounded-btn gradient-brand px-4 text-sm font-bold text-white shadow-raised transition-transform duration-200 active:scale-[0.98]"
          >
            <Plus className="size-[18px]" aria-hidden />
            Asignar
          </Link>
        )}
      </header>

      <AssignmentFilters
        estado={estado}
        persona={persona}
        personas={personas}
        mostrarPersonas={esJefe}
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-7" aria-hidden />}
          title={
            estado === 'abiertas' ? 'No hay tareas pendientes' : 'No hay tareas con ese filtro'
          }
          description={
            esJefe
              ? 'Asigna una entrega para que aparezca aquí.'
              : 'Cuando te asignen una entrega la verás aquí.'
          }
          action={
            esJefe ? (
              <Link
                href="/tareas/nueva"
                className="flex h-12 items-center gap-2 rounded-btn gradient-brand px-5 text-sm font-bold text-white shadow-raised"
              >
                <Plus className="size-[18px]" aria-hidden />
                Asignar entrega
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <AssignmentCard assignment={assignment} mostrarPersona={esJefe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
