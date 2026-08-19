import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Archive, Camera, ExternalLink, MapPin, PenLine, Receipt } from 'lucide-react';
import { DeleteEvidenceDialog } from '@/components/DeleteEvidenceDialog';
import { EvidenceActions } from '@/components/EvidenceActions';
import { EvidenceGallery } from '@/components/EvidenceGallery';
import { Card, SectionCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { isDeleteEnabled } from '@/lib/admin-auth';
import { formatLongDate, formatNumericDate, formatTime } from '@/lib/format';
import { getDelivery } from '@/lib/queries';
import { DOCUMENT_TYPE_LABEL } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const delivery = await getDelivery(id).catch(() => null);
  return { title: delivery ? `Evidencia ${delivery.folio}` : 'Evidencia' };
}

export default async function EvidencePage({ params }: PageProps) {
  const { id } = await params;
  const delivery = await getDelivery(id).catch(() => null);
  if (!delivery) notFound();

  const deleteEnabled = isDeleteEnabled();

  const info: Array<[string, string]> = [
    ['Tipo de documento', DOCUMENT_TYPE_LABEL[delivery.document_type]],
    ['Número', delivery.document_number],
    ['Cliente', delivery.client_name],
    ['Recibido por', delivery.received_by ?? '—'],
    ['Entregado por', delivery.employee_name],
    ['Fecha', formatLongDate(delivery.created_at)],
    ['Hora', formatTime(delivery.created_at)],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      {/* Encabezado del comprobante */}
      <Card className="overflow-hidden">
        <div className="gradient-brand px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
                <Receipt className="size-3.5" aria-hidden />
                Evidencia de entrega
              </p>
              <p className="mt-1.5 font-mono text-xl font-bold tracking-tight">
                {delivery.folio}
              </p>
            </div>
          </div>

          <p className="mt-3 border-t border-white/15 pt-3 text-[15px] font-medium leading-snug">
            {delivery.title}
          </p>
        </div>

        <div className="px-5 py-4">
          <StatusBadge status={delivery.delivery_status} />
        </div>
      </Card>

      {/* Información */}
      <SectionCard title="Información de la entrega">
        <dl className="-my-2 divide-y divide-line">
          {info.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {delivery.notes && (
          <div className="rounded-btn border border-line bg-canvas px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Observaciones
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
              {delivery.notes}
            </p>
          </div>
        )}
      </SectionCard>

      {/* Fotografías */}
      <SectionCard
        icon={<Camera className="size-[18px]" aria-hidden />}
        title="Evidencia fotográfica"
        description={`${delivery.photo_count} ${
          delivery.photo_count === 1 ? 'fotografía registrada' : 'fotografías registradas'
        }`}
      >
        {delivery.photos_archived_at ? (
          <ArchivadoAviso fecha={delivery.photos_archived_at} />
        ) : (
          <EvidenceGallery photos={delivery.photos} />
        )}
      </SectionCard>

      {/* Firma */}
      <SectionCard
        icon={<PenLine className="size-[18px]" aria-hidden />}
        title="Firma registrada"
      >
        {delivery.photos_archived_at ? (
          <ArchivadoAviso fecha={delivery.photos_archived_at} />
        ) : delivery.signature ? (
          <div className="overflow-hidden rounded-btn border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={delivery.signature}
              alt={`Firma de ${delivery.employee_name}`}
              className="mx-auto max-h-56 w-full object-contain"
            />
          </div>
        ) : (
          <p className="rounded-btn border border-line bg-canvas px-4 py-3 text-sm text-muted">
            No se pudo cargar la firma.
          </p>
        )}

        <div>
          <p className="text-sm font-semibold text-ink">
            Firma de {delivery.employee_name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Registrada el {formatNumericDate(delivery.created_at)} a las{' '}
            {formatTime(delivery.created_at)}
          </p>
        </div>
      </SectionCard>

      {/* Ubicación */}
      {delivery.latitude !== null && delivery.longitude !== null && (
        <SectionCard
          icon={<MapPin className="size-[18px]" aria-hidden />}
          title="Ubicación de entrega"
          description={
            delivery.location_accuracy
              ? `Precisión aproximada: ±${Math.round(Number(delivery.location_accuracy))} m`
              : undefined
          }
        >
          <p className="font-mono text-sm text-muted">
            {Number(delivery.latitude).toFixed(6)}, {Number(delivery.longitude).toFixed(6)}
          </p>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-btn border border-brand bg-surface text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
          >
            <ExternalLink className="size-4" aria-hidden />
            Abrir ubicación
          </a>
        </SectionCard>
      )}

      <EvidenceActions folio={delivery.folio} />

      {deleteEnabled && (
        <div className="border-t border-line pt-5">
          <DeleteEvidenceDialog id={delivery.id} folio={delivery.folio} />
        </div>
      )}

      <Link
        href="/historial"
        className="flex h-12 items-center justify-center rounded-btn text-sm font-semibold text-muted transition-colors duration-200 hover:text-brand"
      >
        Volver al historial
      </Link>
    </div>
  );
}

/**
 * Las imágenes de un periodo respaldado se borran de Supabase para liberar
 * espacio, pero la evidencia sigue existiendo: aquí se dice dónde están en vez
 * de mostrar recuadros rotos.
 */
function ArchivadoAviso({ fecha }: { fecha: string }) {
  return (
    <div className="flex items-start gap-3 rounded-btn border border-line bg-canvas px-4 py-3.5">
      <Archive className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Archivada</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Las imágenes pasaron al respaldo el {formatNumericDate(fecha)} para liberar
          espacio. El registro de la entrega se conserva completo.
        </p>
      </div>
    </div>
  );
}
