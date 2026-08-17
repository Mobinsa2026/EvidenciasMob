import Link from 'next/link';
import { ChevronRight, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeDateTime } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL, type AssignmentView } from '@/lib/types';
import { AssignmentStatusBadge } from './AssignmentStatusBadge';
import { duracionCorta } from './tiempo';

export function AssignmentCard({
  assignment,
  mostrarPersona,
}: {
  assignment: AssignmentView;
  mostrarPersona?: boolean;
}) {
  const abierta =
    assignment.status === 'en_progreso' || assignment.status === 'pausada';
  const restante = assignment.segundos_restantes;

  return (
    <Link
      href={`/tareas/${assignment.id}`}
      className={cn(
        'flex items-center gap-3 rounded-card border bg-surface p-4 shadow-card',
        'transition-colors duration-200 hover:border-brand-ring',
        assignment.vencida ? 'border-danger/40' : 'border-line',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
            {DOCUMENT_TYPE_LABEL[assignment.document_type]}
          </span>
          <AssignmentStatusBadge
            status={assignment.status}
            vencida={assignment.vencida}
            className="ml-auto shrink-0"
          />
        </div>

        <p className="mt-1 truncate text-[15px] font-bold text-ink">
          {assignment.document_number}
        </p>
        <p className="truncate text-sm text-muted">{assignment.client_name}</p>

        {assignment.address && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{assignment.address}</span>
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {mostrarPersona && (
            <span className="flex items-center gap-1">
              <User className="size-3.5" aria-hidden />
              {assignment.assigned_to_name}
            </span>
          )}

          <span
            className={cn(
              'flex items-center gap-1 font-semibold',
              assignment.vencida
                ? 'text-danger'
                : abierta && restante < 900
                  ? 'text-warn'
                  : 'text-muted',
            )}
          >
            <Clock className="size-3.5" aria-hidden />
            {assignment.status === 'pendiente'
              ? `Plazo ${duracionCorta(assignment.time_limit_minutes * 60)}`
              : assignment.status === 'completada'
                ? `Tomó ${duracionCorta(assignment.segundos_activos)}`
                : assignment.vencida
                  ? `Vencida por ${duracionCorta(Math.abs(restante))}`
                  : `Quedan ${duracionCorta(restante)}`}
          </span>

          <span className="ml-auto">{formatRelativeDateTime(assignment.created_at)}</span>
        </div>
      </div>

      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
