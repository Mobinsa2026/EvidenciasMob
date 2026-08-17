import Link from 'next/link';
import { ArrowRight, Camera } from 'lucide-react';
import { formatShortDate, formatTime } from '@/lib/format';
import { DOCUMENT_TYPE_SHORT, type DeliveryListItem } from '@/lib/types';
import { StatusBadge } from './ui/StatusBadge';

/**
 * Vista de escritorio del historial. En móvil se usan tarjetas.
 *
 * Las columnas se ajustan al ancho disponible en vez de forzar un mínimo:
 * antes la última columna quedaba cortada tras una barra de desplazamiento.
 */
export function DeliveryTable({ deliveries }: { deliveries: DeliveryListItem[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[7%]" />
          <col className="w-[13%]" />
          <col className="w-[11%]" />
        </colgroup>

        <thead className="border-b border-line bg-canvas">
          <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            <th className="px-3 py-3">Número</th>
            <th className="px-3 py-3">Cliente</th>
            <th className="px-3 py-3">Entregó</th>
            <th className="px-3 py-3">Estado</th>
            <th className="px-3 py-3">Fotos</th>
            <th className="px-3 py-3">Fecha</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {deliveries.map((delivery) => (
            <tr key={delivery.id} className="transition-colors duration-200 hover:bg-canvas">
              <td className="px-3 py-3">
                <span className="block truncate font-semibold text-brand">
                  {delivery.document_number}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                  {DOCUMENT_TYPE_SHORT[delivery.document_type]} · {delivery.folio}
                </span>
              </td>

              <td className="px-3 py-3">
                <span className="block truncate text-ink" title={delivery.client_name}>
                  {delivery.client_name}
                </span>
              </td>

              <td className="px-3 py-3">
                <span className="block truncate text-ink" title={delivery.employee_name}>
                  {delivery.employee_name}
                </span>
              </td>

              <td className="px-3 py-3">
                <StatusBadge status={delivery.delivery_status} compact />
              </td>

              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-1 text-muted">
                  <Camera className="size-4 shrink-0" aria-hidden />
                  {delivery.photo_count}
                </span>
              </td>

              <td className="px-3 py-3 text-muted">
                <span className="block whitespace-nowrap text-[13px]">
                  {formatShortDate(delivery.created_at)}
                </span>
                <span className="block whitespace-nowrap text-[11px]">
                  {formatTime(delivery.created_at)}
                </span>
              </td>

              <td className="px-3 py-3 text-right">
                <Link
                  href={`/evidencias/${delivery.id}`}
                  aria-label={`Ver evidencia ${delivery.folio}`}
                  className="inline-flex h-10 items-center gap-1 rounded-btn border border-brand px-3 text-[13px] font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
                >
                  Ver
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
