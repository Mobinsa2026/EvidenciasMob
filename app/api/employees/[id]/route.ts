import { NextRequest } from 'next/server';
import { jsonError, jsonOk, serverError, tooManyRequests } from '@/lib/api';
import { limitWrite } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/employees/[id]  { active: boolean }
 * Los empleados nunca se eliminan para no romper el historial de evidencias.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { active?: unknown } | null;

    if (typeof body?.active !== 'boolean') {
      return jsonError('Indica si el empleado queda activo o inactivo.', 422);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('employees')
      .update({ active: body.active })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return jsonError('El empleado no existe.', 404);

    return jsonOk({ employee: data });
  } catch (error) {
    return serverError(error, 'No se pudo actualizar el empleado.');
  }
}
