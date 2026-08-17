import { NextRequest } from 'next/server';
import { jsonOk, serverError, unauthorized } from '@/lib/api';
import { UnauthorizedError, requireUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** GET /api/notifications — avisos del usuario en sesión y cuántos sin leer. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Math.min(50, Number(request.nextUrl.searchParams.get('limit') ?? 20));

    const supabase = getSupabaseAdmin();

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, body, assignment_id, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);

    if (error) throw new Error(error.message);

    return jsonOk({ notifications: data ?? [], unread: count ?? 0 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudieron cargar las notificaciones.');
  }
}

/** POST /api/notifications — marca como leídas (todas o las indicadas). */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (Array.isArray(body?.ids) && body.ids.length) {
      query = query.in('id', body.ids as string[]);
    }

    const { error } = await query;
    if (error) throw new Error(error.message);

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudieron marcar las notificaciones.');
  }
}
