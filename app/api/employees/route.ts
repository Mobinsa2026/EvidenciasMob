import { NextRequest } from 'next/server';
import { jsonError, jsonOk, serverError, tooManyRequests } from '@/lib/api';
import { getEmployees } from '@/lib/queries';
import { limitRead, limitWrite } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { employeeInputSchema, fieldErrors } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** GET /api/employees?active=1 */
export async function GET(request: NextRequest) {
  const limit = limitRead(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const onlyActive = request.nextUrl.searchParams.get('active') === '1';
    return jsonOk({ employees: await getEmployees(onlyActive) });
  } catch (error) {
    return serverError(error, 'No se pudieron cargar los empleados.');
  }
}

/** POST /api/employees  { name } */
export async function POST(request: NextRequest) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const body = await request.json().catch(() => null);
    const parsed = employeeInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError('Revisa la información del empleado.', 422, {
        fields: fieldErrors(parsed.error),
      });
    }

    const supabase = getSupabaseAdmin();

    // Si ya existe con el mismo nombre, se reactiva en lugar de duplicar.
    const { data: existing } = await supabase
      .from('employees')
      .select('*')
      .ilike('name', parsed.data.name)
      .maybeSingle();

    if (existing) {
      if (!existing.active) {
        const { data: updated, error } = await supabase
          .from('employees')
          .update({ active: true })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return jsonOk({ employee: updated }, 200);
      }
      return jsonError('Ya existe un empleado con ese nombre.', 409, {
        fields: { name: 'Ya existe un empleado con ese nombre.' },
      });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({ name: parsed.data.name })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return jsonOk({ employee: data }, 201);
  } catch (error) {
    return serverError(error, 'No se pudo registrar el empleado.');
  }
}
