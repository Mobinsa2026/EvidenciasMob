import Link from 'next/link';
import { Camera } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL, type DeliveryListItem } from '@/lib/types';
import { StatusBadge } from './ui/StatusBadge';

/** Vista de escritorio del historial. En móvil se usan tarjetas. */
export function DeliveryTable({ deliveries }: { deliveries: DeliveryListItem[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-canvas">
            <tr className="text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Entregado por</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fotos</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {deliveries.map((delivery) => (
              <tr key={delivery.id} className="transition-colors duration-200 hover:bg-canvas">
                <td className="px-4 py-3 text-muted">
                  {DOCUMENT_TYPE_LABEL[delivery.document_type]}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-brand">{delivery.document_number}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted">
                    {delivery.folio}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-ink">
                  {delivery.client_name}
                </td>
                <td className="px-4 py-3 text-ink">{delivery.employee_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={delivery.delivery_status} />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Camera className="size-4" aria-hidden />
                    {delivery.photo_count}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDateTime(delivery.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    href={`/evidencias/${delivery.id}`}
                    className="inline-flex h-10 items-center rounded-btn border border-brand px-3.5 text-[13px] font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
                  >
                    Ver evidencia
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
