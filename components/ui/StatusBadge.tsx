import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, type DeliveryStatus } from '@/lib/types';

export const STATUS_STYLES: Record<
  DeliveryStatus,
  { badge: string; dot: string; icon: typeof CheckCircle2; accent: string }
> = {
  completa: {
    badge: 'bg-success-soft text-[#14664a] border-success/25',
    dot: 'bg-success',
    icon: CheckCircle2,
    accent: 'text-success',
  },
  parcial: {
    badge: 'bg-warn-soft text-[#8a5a05] border-warn/30',
    dot: 'bg-warn',
    icon: AlertTriangle,
    accent: 'text-warn',
  },
  no_entregada: {
    badge: 'bg-danger-soft text-[#8f100d] border-danger/25',
    dot: 'bg-danger',
    icon: XCircle,
    accent: 'text-danger',
  },
};

/** Etiqueta corta para columnas angostas, donde el texto completo no cabe. */
const STATUS_LABEL_SHORT: Record<DeliveryStatus, string> = {
  completa: 'Completa',
  parcial: 'Parcial',
  no_entregada: 'No entregada',
};

export function StatusBadge({
  status,
  className,
  compact,
}: {
  status: DeliveryStatus;
  className?: string;
  compact?: boolean;
}) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        style.badge,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {compact ? STATUS_LABEL_SHORT[status] : STATUS_LABEL[status]}
      </span>
    </span>
  );
}
