/**
 * Compresión de imágenes en el navegador.
 * Nunca se sube la foto original: se redimensiona y se convierte a WebP
 * (con respaldo a JPEG) buscando quedar por debajo de ~350 KB.
 *
 * Las medidas están calibradas para el plan Free de Supabase: 1 GB de Storage.
 * A 1280 px la evidencia se lee perfectamente en pantalla y al abrirla a
 * tamaño completo, y caben unas tres veces más entregas que a 1600 px.
 *
 * De cada foto salen dos archivos: la imagen y una miniatura de 320 px. La
 * galería usa la miniatura, así que abrir una evidencia baja ~60 KB en vez de
 * más de un mega.
 */

const MAX_DIMENSION = 1280;
const TARGET_BYTES = 350 * 1024;
const QUALITIES = [0.72, 0.64, 0.58, 0.5];

const THUMB_DIMENSION = 320;
const THUMB_QUALITY = 0.6;

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
  /** Miniatura de 320 px para la galería. `null` si el navegador falló. */
  thumb: Blob | null;
}

/** Dibuja el origen ya decodificado en un canvas del tamaño pedido. */
function dibujar(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight) || 1);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes.');
  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  const source = await loadBitmap(file);
  const sourceWidth = 'width' in source ? source.width : 0;
  const sourceHeight = 'height' in source ? source.height : 0;

  const useWebp = supportsWebp();
  const type = useWebp ? 'image/webp' : 'image/jpeg';

  const canvas = dibujar(source as CanvasImageSource, sourceWidth, sourceHeight, MAX_DIMENSION);

  let blob = await toBlob(canvas, type, QUALITIES[0]);
  for (let i = 1; i < QUALITIES.length && blob.size > TARGET_BYTES; i++) {
    blob = await toBlob(canvas, type, QUALITIES[i]);
  }

  // La miniatura sale del mismo bitmap ya decodificado: en un celular de gama
  // baja decodificar dos veces una foto de 12 MP se siente.
  let thumb: Blob | null = null;
  try {
    const chico = dibujar(
      source as CanvasImageSource,
      sourceWidth,
      sourceHeight,
      THUMB_DIMENSION,
    );
    thumb = await toBlob(chico, type, THUMB_QUALITY);
  } catch {
    // Sin miniatura la galería usa la foto completa: se gasta más, pero
    // registrar la entrega nunca debe fallar por esto.
  }

  if ('close' in source && typeof source.close === 'function') source.close();

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    bytes: blob.size,
    extension: useWebp ? 'webp' : 'jpg',
    thumb,
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
