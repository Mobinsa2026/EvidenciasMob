/**
 * Compresión de imágenes en el navegador.
 * Nunca se sube la foto original: se redimensiona y se convierte a WebP
 * (con respaldo a JPEG) buscando quedar por debajo de ~1 MB.
 */

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 1024 * 1024;
const QUALITIES = [0.82, 0.74, 0.66, 0.6];

let webpSupport: boolean | null = null;

function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  return webpSupport;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari antiguo: se usa el respaldo con <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      type,
      quality,
    );
  });
}

export interface CompressedImage {
  blob: Blob;
  /** Object URL para la previsualización. Liberar con `URL.revokeObjectURL`. */
  previewUrl: string;
  width: number;
  height: number;
  bytes: number;
  extension: 'webp' | 'jpg';
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  const source = await loadBitmap(file);
  const sourceWidth = 'width' in source ? source.width : 0;
  const sourceHeight = 'height' in source ? source.height : 0;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight) || 1);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes.');
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ('close' in source && typeof source.close === 'function') source.close();

  const useWebp = supportsWebp();
  const type = useWebp ? 'image/webp' : 'image/jpeg';

  let blob = await toBlob(canvas, type, QUALITIES[0]);
  for (let i = 1; i < QUALITIES.length && blob.size > TARGET_BYTES; i++) {
    blob = await toBlob(canvas, type, QUALITIES[i]);
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    bytes: blob.size,
    extension: useWebp ? 'webp' : 'jpg',
  };
}

/** Exporta el canvas de la firma recortado a su contenido real. */
export async function canvasToSignatureBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const type = supportsWebp() ? 'image/webp' : 'image/png';
  return toBlob(canvas, type, 0.92);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
