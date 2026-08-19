import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';

export const PHOTOS_BUCKET = 'delivery-photos';
export const SIGNATURES_BUCKET = 'delivery-signatures';

/** Vigencia de las URLs firmadas que se envían al navegador. */
const SIGNED_URL_TTL = 4 * 60 * 60; // 4 horas

/** Margen antes de vencer: nunca se entrega una URL a punto de caducar. */
const RENOVAR_ANTES_MS = 10 * 60_000;

function extensionFor(mime: string): string {
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('png')) return 'png';
  return 'jpg';
}

/** `2026/08/EV-20260814-000123/photo-1.webp` */
export function photoPath(folio: string, position: number, mime: string): string {
  const [, year, month] = folio.match(/^EV-(\d{4})(\d{2})\d{2}-/) ?? [];
  return `${year}/${month}/${folio}/photo-${position}.${extensionFor(mime)}`;
}

/** `2026/08/EV-20260814-000123/photo-1-thumb.webp` */
export function thumbPath(folio: string, position: number, mime: string): string {
  const [, year, month] = folio.match(/^EV-(\d{4})(\d{2})\d{2}-/) ?? [];
  return `${year}/${month}/${folio}/photo-${position}-thumb.${extensionFor(mime)}`;
}

/** `2026/08/EV-20260814-000123/signature.webp` */
export function signaturePath(folio: string, mime: string): string {
  const [, year, month] = folio.match(/^EV-(\d{4})(\d{2})\d{2}-/) ?? [];
  return `${year}/${month}/${folio}/signature.${extensionFor(mime)}`;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  });

  if (error) {
    throw new Error(`No se pudo subir el archivo (${path}): ${error.message}`);
  }
}

/** Limpieza best-effort cuando falla el insert después de subir archivos. */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (!paths.length) return;
  try {
    await getSupabaseAdmin().storage.from(bucket).remove(paths);
  } catch {
    // No interrumpe la respuesta de error principal.
  } finally {
    olvidarUrls(bucket, paths);
  }
}

// ─── Caché de URLs firmadas ─────────────────────────────────────────────────
// Los archivos se suben con `cacheControl` de un año, pero eso no servía de
// nada: cada llamada a `createSignedUrl` produce un token distinto, así que la
// URL cambiaba en cada visita y el navegador volvía a descargar la imagen.
//
// Guardando la URL hasta poco antes de que caduque, la misma foto conserva la
// misma dirección durante horas y la segunda visita sale de la caché del
// navegador sin consumir egress. Es memoria del proceso, igual que la ventana
// de `lib/rate-limit.ts`: si Railway reinicia, se vuelve a firmar y ya.

const cache = new Map<string, { url: string; expira: number }>();

/** Evita que la caché crezca sin límite en un proceso de larga vida. */
const CACHE_MAX = 2000;

function clave(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

function leerCache(bucket: string, path: string): string | null {
  const hit = cache.get(clave(bucket, path));
  if (!hit) return null;
  if (hit.expira <= Date.now()) {
    cache.delete(clave(bucket, path));
    return null;
  }
  return hit.url;
}

function guardarCache(bucket: string, path: string, url: string): void {
  if (cache.size >= CACHE_MAX) {
    // Map conserva el orden de inserción: la primera llave es la más vieja.
    const primera = cache.keys().next();
    if (!primera.done) cache.delete(primera.value);
  }
  cache.set(clave(bucket, path), {
    url,
    expira: Date.now() + SIGNED_URL_TTL * 1000 - RENOVAR_ANTES_MS,
  });
}

/** Borra de la caché los archivos que dejaron de existir. */
export function olvidarUrls(bucket: string, paths: string[]): void {
  for (const path of paths) cache.delete(clave(bucket, path));
}

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const cacheada = leerCache(bucket, path);
  if (cacheada) return cacheada;

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return null;

  guardarCache(bucket, path, data.signedUrl);
  return data.signedUrl;
}

export async function signedUrls(
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;

  const faltantes: string[] = [];
  for (const path of paths) {
    const cacheada = leerCache(bucket, path);
    if (cacheada) map.set(path, cacheada);
    else faltantes.push(path);
  }

  if (!faltantes.length) return map;

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUrls(faltantes, SIGNED_URL_TTL);

  if (error || !data) return map;

  for (const item of data) {
    if (item.path && item.signedUrl) {
      map.set(item.path, item.signedUrl);
      guardarCache(bucket, item.path, item.signedUrl);
    }
  }
  return map;
}
