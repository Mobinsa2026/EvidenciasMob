'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Camera, ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { compressImage, formatBytes } from '@/lib/image';
import { MAX_PHOTOS } from '@/lib/types';
import { useToast } from './ui/Toast';
import { PhotoLightbox } from './PhotoPreview';

export interface PhotoItem {
  id: string;
  blob: Blob;
  previewUrl: string;
  bytes: number;
  extension: 'webp' | 'jpg';
  /** Miniatura de 320 px para la galería. `null` si no se pudo generar. */
  thumb: Blob | null;
}

interface PhotoUploaderProps {
  photos: PhotoItem[];
  error?: string;
  onChange: (photos: PhotoItem[]) => void;
}

export function PhotoUploader({ photos, error, onChange }: PhotoUploaderProps) {
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const remaining = MAX_PHOTOS - photos.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList);
    if (files.length > remaining) {
      toast.error(`Máximo ${MAX_PHOTOS} fotografías`);
    }

    const accepted = files.slice(0, remaining);
    if (!accepted.length) return;

    setProcessing(true);
    const added: PhotoItem[] = [];

    for (const file of accepted) {
      try {
        const compressed = await compressImage(file);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob: compressed.blob,
          previewUrl: compressed.previewUrl,
          bytes: compressed.bytes,
          extension: compressed.extension,
          thumb: compressed.thumb,
        });
      } catch {
        toast.error('Error al cargar la fotografía');
      }
    }

    setProcessing(false);

    if (added.length) {
      onChange([...photos, ...added]);
      toast.success(
        added.length === 1 ? 'Fotografía agregada' : `${added.length} fotografías agregadas`,
      );
    }
  }

  function removePhoto(id: string) {
    const target = photos.find((photo) => photo.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter((photo) => photo.id !== id));
  }

  return (
    <div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            photos.length > 0 ? 'text-brand' : 'text-muted',
          )}
        >
          {photos.length} de {MAX_PHOTOS} fotografías
        </p>
        {processing && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Optimizando…
          </span>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-btn border border-line bg-canvas animate-pop-in"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="block size-full"
                aria-label={`Ver fotografía ${index + 1}`}
              >
                {/* Object URL local: <img> evita el optimizador de next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={`Fotografía ${index + 1}`}
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </button>

              <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                {index + 1}
              </span>

              <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {formatBytes(photo.bytes)}
              </span>

              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label={`Eliminar fotografía ${index + 1}`}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-danger text-white shadow-float transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-btn border border-dashed border-brand-ring bg-surface text-brand transition-colors duration-200 hover:bg-brand-soft"
            >
              <Plus className="size-6" aria-hidden />
              <span className="text-xs font-semibold">Agregar</span>
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={remaining === 0 || processing}
          onClick={() => cameraRef.current?.click()}
          className="flex h-14 items-center justify-center gap-2.5 rounded-btn bg-brand font-semibold text-white shadow-raised transition-all duration-200 hover:bg-brand-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="size-5" aria-hidden />
          Tomar foto
        </button>

        <button
          type="button"
          disabled={remaining === 0 || processing}
          onClick={() => galleryRef.current?.click()}
          className="flex h-14 items-center justify-center gap-2.5 rounded-btn border border-brand bg-surface font-semibold text-brand transition-all duration-200 hover:bg-brand-soft active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="size-5" aria-hidden />
          Seleccionar de galería
        </button>
      </div>

      {remaining === 0 && (
        <p className="mt-2.5 text-center text-xs text-muted">
          Alcanzaste el máximo de {MAX_PHOTOS} fotografías.
        </p>
      )}

      {error && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-up">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos.map((photo, index) => ({
            url: photo.previewUrl,
            label: `Fotografía ${index + 1}`,
          }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
