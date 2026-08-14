import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/**
 * Contraseña de administración (borrado de evidencias).
 *
 * Vive solo en el servidor. El navegador nunca la recibe: envía el intento y
 * el backend responde sí o no.
 */

export function isDeleteEnabled(): boolean {
  return Boolean(process.env.DELETE_PASSWORD);
}

/** Comparación en tiempo constante para no filtrar la contraseña por timing. */
export function checkAdminPassword(attempt: unknown): boolean {
  const expected = process.env.DELETE_PASSWORD;
  if (!expected || typeof attempt !== 'string' || !attempt) return false;

  const a = Buffer.from(attempt, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
