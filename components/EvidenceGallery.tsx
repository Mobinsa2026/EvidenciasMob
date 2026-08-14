'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { DeliveryPhoto } from '@/lib/types';
import { PhotoLightbox } from './PhotoPreview';

export function EvidenceGallery({ photos }: { photos: DeliveryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-btn border border-line bg-canvas px-4 py-3 text-sm text-muted">
        <ImageOff className="size-4" aria-hidden />
        Esta evidencia no tiene fotografías.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, position) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setIndex(position)}
            aria-label={`Ver fotografía ${position + 1}`}
            className="group relative aspect-square overflow-hidden rounded-btn border border-line bg-canvas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Fotografía ${position + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            />
            <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
              {position + 1}
            </span>
          </button>
        ))}
      </div>

      {index !== null && (
        <PhotoLightbox
          photos={photos.map((photo, position) => ({
            url: photo.url,
            label: `Fotografía ${position + 1} de ${photos.length}`,
          }))}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setIndex(null)}
        />
      )}
    </>
  );
}
