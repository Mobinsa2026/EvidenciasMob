import Link from 'next/link';
import { Camera, ChevronRight, FileText, ScrollText, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeDateTime } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL, type DeliveryListItem } from '@/lib/types';
import { StatusBadge, STATUS_STYLES } from './ui/StatusBadge';
import { Card } from './ui/Card';

export function DeliveryCard({ delivery }: { delivery: DeliveryListItem }) {
  const DocIcon = delivery.document_type === 'orden_trabajo' ? ScrollText : FileText;

  return (
    <Card className="transition-all duration-200 hover:border-brand-ring hover:shadow-raised">
      <Link
        href={`/evidencias/${delivery.id}`}
        className="block rounded-card px-5 py-4"
        aria-label={`Ver evidencia ${delivery.folio}`}
      >
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <DocIcon className="size-5" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {DOCUMENT_TYPE_LABEL[delivery.document_type]}
            </p>
            <p className="mt-0.5 truncate text-[17px] font-bold leading-tight text-brand">
              {delivery.document_number}
            </p>
            <p className="mt-1 truncate text-sm text-ink">{delivery.client_name}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
              <span>{formatRelativeDateTime(delivery.created_at)}</span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" aria-hidden />
                {delivery.employee_name}
              </span>
            </div>
          </div>

          <ChevronRight className="mt-3 size-5 shrink-0 text-muted/60" aria-hidden />
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
          <StatusBadge status={delivery.delivery_status} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
            <Camera className="size-3.5" aria-hidden />
            {delivery.photo_count} {delivery.photo_count === 1 ? 'foto' : 'fotos'}
          </span>
          <span className="ml-auto font-mono text-[11px] text-muted/80">
            {delivery.folio}
          </span>
        </div>
      </Link>
    </Card>
  );
}

/** Fila compacta usada en "Entregas recientes". */
export function DeliveryRow({ delivery }: { delivery: DeliveryListItem }) {
  const DocIcon = delivery.document_type === 'orden_trabajo' ? ScrollText : FileText;

  return (
    <Link
      href={`/evidencias/${delivery.id}`}
      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-200 hover:bg-canvas"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <DocIcon className="size-[18px]" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[15px] font-bold leading-tight text-ink">
            {delivery.document_number}
          </p>
          <span className="shrink-0 text-[11px] text-muted">
            {DOCUMENT_TYPE_LABEL[delivery.document_type]}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {delivery.client_name} · {delivery.employee_name}
        </p>
        <p className="mt-0.5 text-xs text-muted/80">
          {formatRelativeDateTime(delivery.created_at)}
        </p>
      </div>

      <div className="shrink-0">
        {/* El badge completo solo cabe en pantallas medianas; en móvil, un punto. */}
        <span className="hidden sm:block">
          <StatusBadge status={delivery.delivery_status} />
        </span>
        <span
          className={cn(
            'block size-2.5 rounded-full sm:hidden',
            STATUS_STYLES[delivery.delivery_status].dot,
          )}
          aria-hidden
        />
      </div>
    </Link>
  );
}
