import 'server-only';
import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error:
        'Se registraron demasiadas solicitudes desde este dispositivo. Espera un momento e inténtalo de nuevo.',
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

export function unauthorized(message = 'Inicia sesión para continuar.') {
  return jsonError(message, 401);
}

export function forbidden(message = 'No tienes permiso para esta acción.') {
  return jsonError(message, 403);
}

/** Traduce cualquier excepción a una respuesta segura (sin filtrar internos). */
export function serverError(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[api]', message);

  if (message.includes('Faltan variables de entorno')) {
    return jsonError(
      'La aplicación no está conectada a Supabase. Revisa las variables de entorno.',
      503,
    );
  }
  return jsonError(fallback, 500);
}
