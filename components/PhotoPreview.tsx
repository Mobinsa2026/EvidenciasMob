'use client';

import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Portal } from './ui/Portal';

export interface LightboxPhoto {
  url: string;
  label: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Visor a pantalla completa con navegación por teclado y botones. */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const total = photos.length;

  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={photo.label}
        className="fixed inset-0 z-[80] flex flex-col bg-black/92 backdrop-blur-sm animate-pop-in"
        onClick={onClose}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 text-white">
          <span className="text-sm font-medium tabular-nums">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-white/20"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.label}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>

              <button
                type="button"
                aria-label="Siguiente"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>

        <p className="px-4 pb-5 text-center text-sm text-white/70">{photo.label}</p>
      </div>
    </Portal>
  );
}
