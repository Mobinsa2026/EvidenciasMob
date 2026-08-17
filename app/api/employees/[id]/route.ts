import { NextRequest } from 'next/server';
import { forbidden, jsonError, jsonOk, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { ForbiddenError, UnauthorizedError, requireJefe } from '@/lib/auth';
import { limitWrite } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { employeeInputSchema, fieldErrors } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/employees/[id]  { name?: string, active?: boolean }
 *
 * Renombrar es seguro: las evidencias apuntan al id, no al nombre, así que el
 * historial se actualiza solo.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    await requireJefe();

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      active?: unknown;
    } | null;

    const patch: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const parsed = employeeInputSchema.safeParse({ name: body.name });
      if (!parsed.success) {
        return jsonError('Revisa el nombre.', 422, { fields: fieldErrors(parsed.error) });
      }
      patch.name = parsed.data.name;
    }

    if (body?.active !== undefined) {
      if (typeof body.active !== 'boolean') {
        return jsonError('Indica si el empleado queda activo o inactivo.', 422);
      }
      patch.active = body.active;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError('No se indicó ningún cambio.', 422);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('employees')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return jsonError('Ya existe un empleado con ese nombre.', 409, {
          fields: { name: 'Ese nombre ya está registrado.' },
        });
      }
      throw new Error(error.message);
    }
    if (!data) return jsonError('El empleado no existe.', 404);

    // Si el empleado tiene cuenta de acceso, el nombre debe coincidir para que
    // la sesión y el historial no muestren nombres distintos.
    if (patch.name) {
      await supabase.from('app_users').update({ name: patch.name }).eq('employee_id', id);
    }

    return jsonOk({ employee: data });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    if (error instanceof ForbiddenError) {
      return forbidden('Solo el jefe puede editar empleados.');
    }
    return serverError(error, 'No se pudo actualizar el empleado.');
  }
}

/**
 * DELETE /api/employees/[id]
 *
 * Solo se permite si el empleado no dejó rastro: sin evidencias, sin tareas y
 * sin cuenta de acceso. Si ya tiene historial, borrarlo dejaría evidencias
 * huérfanas, así que se responde 409 y se sugiere desactivarlo.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    await requireJefe();

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: employee, error: findError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    if (!employee) return jsonError('El empleado no existe.', 404);

    const [{ count: entregas }, { count: cuentas }] = await Promise.all([
      supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('delivered_by', id),
      supabase
        .from('app_users')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', id),
    ]);

    if (cuentas && cuentas > 0) {
      return jsonError(
        `${employee.name} tiene una cuenta de acceso al sistema. Desactívalo en lugar de eliminarlo.`,
        409,
        { motivo: 'tiene_cuenta' },
      );
    }

    if (entregas && entregas > 0) {
      return jsonError(
        `${employee.name} tiene ${entregas} evidencia${entregas === 1 ? '' : 's'} registrada${
          entregas === 1 ? '' : 's'
        }. Eliminarlo dejaría esas entregas sin responsable, así que solo puede desactivarse.`,
        409,
        { motivo: 'tiene_historial', entregas },
      );
    }

    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw new Error(error.message);

    return jsonOk({ deleted: true, name: employee.name });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    if (error instanceof ForbiddenError) {
      return forbidden('Solo el jefe puede eliminar empleados.');
    }
    return serverError(error, 'No se pudo eliminar el empleado.');
  }
}
