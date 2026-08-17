import { AlertTriangle, CheckCircle2, CircleDashed, Pause, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ASSIGNMENT_STATUS_LABEL, type AssignmentStatus } from '@/lib/types';

const ESTILOS: Record<AssignmentStatus, { badge: string; icon: typeof Play }> = {
  pendiente: { badge: 'bg-canvas text-muted border-line', icon: CircleDashed },
  en_progreso: { badge: 'bg-brand-soft text-brand border-brand-ring/40', icon: Play },
  pausada: { badge: 'bg-warn-soft text-warn border-warn/30', icon: Pause },
  completada: { badge: 'bg-success-soft text-success border-success/30', icon: CheckCircle2 },
  cancelada: { badge: 'bg-canvas text-muted border-line', icon: XCircle },
};

export function AssignmentStatusBadge({
  status,
  vencida,
  className,
}: {
  status: AssignmentStatus;
  vencida?: boolean;
  className?: string;
}) {
  if (vencida) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft',
          'px-2.5 py-1 text-[11px] font-bold text-danger',
          className,
        )}
      >
        <AlertTriangle className="size-3.5" aria-hidden />
        Fuera de plazo
      </span>
    );
  }

  const estilo = ESTILOS[status];
  const Icon = estilo.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold',
        estilo.badge,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {ASSIGNMENT_STATUS_LABEL[status]}
    </span>
  );
}
