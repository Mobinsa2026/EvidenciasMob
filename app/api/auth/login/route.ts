import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jsonError, jsonOk, serverError } from '@/lib/api';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** POST /api/auth/login  { username, password } */
export async function POST(request: NextRequest) {
  // 10 intentos por hora y por IP: suficiente para un error de dedo, corto
  // para probar contraseñas al azar.
  const limit = rateLimit(`login:${clientIp(request)}`, 10, 60 * 60);
  if (!limit.ok) {
    return jsonError(
      `Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
      429,
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      username?: unknown;
      password?: unknown;
    } | null;

    const username = sanitizeText(body?.username).toLowerCase();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password) {
      return jsonError('Escribe tu usuario y tu contraseña.', 422, {
        fields: {
          ...(username ? {} : { username: 'Escribe tu usuario.' }),
          ...(password ? {} : { password: 'Escribe tu contraseña.' }),
        },
      });
    }

    const { data: user, error } = await getSupabaseAdmin()
      .from('app_users')
      .select('id, name, username, password_hash, role, active')
      .ilike('username', username)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Mismo mensaje para usuario inexistente y contraseña mala: no se revela
    // cuáles usuarios existen.
    const credencialesInvalidas = jsonError('Usuario o contraseña incorrectos.', 401);

    if (!user || !user.active) return credencialesInvalidas;
    if (!verifyPassword(password, user.password_hash as string)) return credencialesInvalidas;

    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(user.id as string), sessionCookieOptions());

    await getSupabaseAdmin()
      .from('app_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    return serverError(error, 'No se pudo iniciar sesión.');
  }
}
