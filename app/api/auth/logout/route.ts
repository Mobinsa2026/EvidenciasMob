import { cookies } from 'next/headers';
import { jsonOk } from '@/lib/api';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — borra la cookie de sesión. */
export async function POST() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return jsonOk({ ok: true });
}
