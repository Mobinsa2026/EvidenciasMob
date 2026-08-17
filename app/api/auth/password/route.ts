import { NextRequest } from 'next/server';
import { jsonError, jsonOk, serverError, unauthorized } from '@/lib/api';
import {
  UnauthorizedError,
  getSessionUser,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** POST /api/auth/password  { actual, nueva } — cambia la propia contraseña. */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) throw new UnauthorizedError();

    const body = (await request.json().catch(() => null)) as {
      actual?: unknown;
      nueva?: unknown;
    } | null;

    const actual = typeof body?.actual === 'string' ? body.actual : '';
    const nueva = typeof body?.nueva === 'string' ? body.nueva : '';

    if (nueva.length < 8) {
      return jsonError('La nueva contraseña debe tener al menos 8 caracteres.', 422, {
        fields: { nueva: 'Mínimo 8 caracteres.' },
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('app_users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || !verifyPassword(actual, data.password_hash as string)) {
      return jsonError('Tu contraseña actual no es correcta.', 401, {
        fields: { actual: 'Contraseña incorrecta.' },
      });
    }

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ password_hash: hashPassword(nueva) })
      .eq('id', user.id);

    if (updateError) throw new Error(updateError.message);

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudo cambiar la contraseña.');
  }
}
