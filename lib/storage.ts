import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';

export const PHOTOS_BUCKET = 'delivery-photos';
export const SIGNATURES_BUCKET = 'delivery-signatures';

/** Vigencia de las URLs firmadas que se envían al navegador. */
const SIGNED_URL_TTL = 60 * 60; // 1 hora

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
  }
}

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);

  return error ? null : (data?.signedUrl ?? null);
}

export async function signedUrls(
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL);

  if (error || !data) return map;

  for (const item of data) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
