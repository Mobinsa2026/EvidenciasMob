import 'server-only';

/**
 * Rate limiting en memoria (ventana deslizante).
 *
 * Suficiente para un despliegue de una sola instancia en Railway. Si algún día
 * se escala horizontalmente, reemplazar el `Map` por Redis manteniendo la firma.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Limpieza perezosa cada 5 minutos para que el Map no crezca sin control.
  if (now - lastSweep < 5 * 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    if (!hits.length || now - hits[hits.length - 1] > 60 * 60_000) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const windowMs = windowSeconds * 1000;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}

/** IP del cliente detrás del proxy de Railway. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'desconocida';
}

/** 15 registros por hora y por IP. */
export function limitWrite(request: Request): RateLimitResult {
  return rateLimit(`write:${clientIp(request)}`, 15, 60 * 60);
}

/** 90 lecturas por minuto y por IP (búsqueda con debounce incluida). */
export function limitRead(request: Request): RateLimitResult {
  return rateLimit(`read:${clientIp(request)}`, 90, 60);
}

/**
 * Intentos de borrado: 8 por hora y por IP.
 * Límite estricto porque cada intento adivina la contraseña del jefe.
 */
export function limitDelete(request: Request): RateLimitResult {
  return rateLimit(`delete:${clientIp(request)}`, 8, 60 * 60);
}

/**
 * Cloudflare Turnstile — desactivado mientras no exista `TURNSTILE_SECRET_KEY`.
 * Al definir la variable, la verificación se activa sin tocar el resto del código.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
      },
    );
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
