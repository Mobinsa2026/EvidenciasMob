import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileText, MapPin, Receipt, User } from 'lucide-react';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import { AssignmentTimeline } from '@/components/AssignmentTimeline';
import { AssignmentTimer } from '@/components/AssignmentTimer';
import { Card } from '@/components/ui/Card';
import { getAssignment, getAssignmentEvents } from '@/lib/assignments';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL } from '@/lib/types';
import { plazoLegible } from '@/components/tiempo';

export const metadata: Metadata = { title: 'Detalle de la tarea' };
export const dynamic = 'force-dynamic';

export default async function TareaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const assignment = await getAssignment(id).catch(() => null);
  if (!assignment) notFound();

  // Un asistente solo entra a lo suyo.
  if (user.role !== 'jefe' && assignment.assigned_to !== user.id) {
    redirect('/tareas');
  }

  const events = await getAssignmentEvents(assignment.id);
  const esResponsable = assignment.assigned_to === user.id;
  const Icono = assignment.document_type === 'orden_trabajo' ? FileText : Receipt;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      <Card className="overflow-hidden p-0">
        <div className="gradient-brand px-5 py-5 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
            <Icono className="size-3.5" aria-hidden />
            {DOCUMENT_TYPE_LABEL[assignment.document_type]}
          </p>
          <p className="mt-1.5 break-all font-mono text-lg font-bold tracking-tight">
            {assignment.document_number}
          </p>
          <p className="mt-1 text-sm text-white/85">{assignment.client_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <AssignmentStatusBadge status={assignment.status} vencida={assignment.vencida} />
          <span className="text-xs text-muted">
            Plazo de {plazoLegible(assignment.time_limit_minutes)}
          </span>
          <span className="ml-auto font-mono text-[11px] text-muted">{assignment.folio}</span>
        </div>
      </Card>

      <AssignmentTimer assignment={assignment} puedeOperar={esResponsable} />

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">Detalle de la entrega</h2>

        <dl className="divide-y divide-line text-sm">
          <Fila label="Título" value={assignment.title} />
          <Fila label="Asignada a" value={assignment.assigned_to_name} icon={User} />
          <Fila label="Asignada por" value={assignment.created_by_name} />
          {assignment.address && (
            <Fila label="Dirección" value={assignment.address} icon={MapPin} />
          )}
          <Fila label="Creada" value={formatDateTime(assignment.created_at)} />
          {assignment.started_at && (
            <Fila label="Iniciada" value={formatDateTime(assignment.started_at)} />
          )}
          {assignment.completed_at && (
            <Fila label="Completada" value={formatDateTime(assignment.completed_at)} />
          )}
        </dl>

        {assignment.instructions && (
          <div className="mt-4 rounded-btn bg-canvas p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Instrucciones
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
              {assignment.instructions}
            </p>
          </div>
        )}

        {assignment.delivery_id && (
          <Link
            href={`/evidencias/${assignment.delivery_id}`}
            className="mt-4 flex h-12 items-center justify-center rounded-btn border border-brand bg-surface text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
          >
            Ver evidencia registrada
          </Link>
        )}
      </Card>

      <AssignmentTimeline events={events} />
    </div>
  );
}

function Fila({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof User;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right font-semibold text-ink">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />}
        <span className="break-words">{value}</span>
      </dd>
    </div>
  );
}
