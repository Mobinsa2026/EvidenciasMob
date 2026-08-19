'use client';

import { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  CircleDashed,
  Pause,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { ASSIGNMENT_EVENT_LABEL, type AssignmentEvent } from '@/lib/types';
import { Card } from './ui/Card';
import { PhotoLightbox } from './PhotoPreview';

const ICONOS = {
  asignada: { icon: CircleDashed, color: 'bg-canvas text-muted' },
  iniciada: { icon: Play, color: 'bg-brand-soft text-brand' },
  pausada: { icon: Pause, color: 'bg-warn-soft text-warn' },
  reanudada: { icon: RotateCcw, color: 'bg-brand-soft text-brand' },
  completada: { icon: CheckCircle2, color: 'bg-success-soft text-success' },
  cancelada: { icon: XCircle, color: 'bg-danger-soft text-danger' },
} as const;

export function AssignmentTimeline({ events }: { events: AssignmentEvent[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);

  const fotos = events
    .filter((event) => event.photo)
    .map((event) => ({
      url: event.photo as string,
      label: `${ASSIGNMENT_EVENT_LABEL[event.type]} · ${formatDateTime(event.created_at)}`,
    }));

  if (events.length === 0) return null;

  return (
    <>
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-ink">Bitácora</h2>

        <ol className="space-y-4">
          {events.map((event, index) => {
            const estilo = ICONOS[event.type] ?? ICONOS.asignada;
            const Icon = estilo.icon;
            const indiceFoto = event.photo
              ? fotos.findIndex((foto) => foto.url === event.photo)
              : -1;

            return (
              <li key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      estilo.color,
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {index < events.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-line" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm font-semibold text-ink">
                    {ASSIGNMENT_EVENT_LABEL[event.type]}
                  </p>
                  <p className="text-xs text-muted">
                    {event.user_name} · {formatDateTime(event.created_at)}
                  </p>

                  {event.note && (
                    <p className="mt-1 break-words text-xs text-muted">{event.note}</p>
                  )}

                  {event.photo && (
                    <button
                      type="button"
                      onClick={() => setAbierta(indiceFoto)}
                      className="mt-2 block overflow-hidden rounded-btn border border-line transition-transform duration-200 active:scale-[0.98]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.photo}
                        alt={`Fotografía de ${ASSIGNMENT_EVENT_LABEL[event.type]}`}
                        className="h-24 w-32 object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}

                  {event.photo_archived_at && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <Archive className="size-3.5 shrink-0" aria-hidden />
                      Fotografía archivada en el respaldo
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {abierta !== null && abierta >= 0 && (
        <PhotoLightbox
          photos={fotos}
          index={abierta}
          onIndexChange={setAbierta}
          onClose={() => setAbierta(null)}
        />
      )}
    </>
  );
}
