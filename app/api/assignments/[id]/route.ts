import { NextRequest } from 'next/server';
import { forbidden, jsonError, jsonOk, serverError, unauthorized } from '@/lib/api';
import { UnauthorizedError, requireUser } from '@/lib/auth';
import { getAssignment, getAssignmentEvents, notificar } from '@/lib/assignments';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** GET /api/assignments/[id] — tarea con su bitácora. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const assignment = await getAssignment(id);
    if (!assignment) return jsonError('La tarea no existe.', 404);

    if (user.role !== 'jefe' && assignment.assigned_to !== user.id) {
      return forbidden('Esta tarea está asignada a otra persona.');
    }

    const events = await getAssignmentEvents(assignment.id);
    return jsonOk({ assignment, events });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudo cargar la tarea.');
  }
}

/** DELETE /api/assignments/[id] — el jefe cancela una tarea sin completar. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (user.role !== 'jefe') return forbidden('Solo el jefe puede cancelar tareas.');

    const { id } = await params;
    const assignment = await getAssignment(id);
    if (!assignment) return jsonError('La tarea no existe.', 404);

    if (assignment.status === 'completada') {
      return jsonError('Una tarea completada ya no se puede cancelar.', 409);
    }

    const body = (await request.json().catch(() => null)) as { motivo?: unknown } | null;
    const motivo = sanitizeText(body?.motivo).slice(0, 300) || null;

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('assignments')
      .update({ status: 'cancelada', paused_at: null })
      .eq('id', assignment.id);

    if (error) throw new Error(error.message);

    await supabase.from('assignment_events').insert({
      assignment_id: assignment.id,
      user_id: user.id,
      type: 'cancelada',
      note: motivo,
    });

    await notificar({
      userId: assignment.assigned_to,
      type: 'tarea_cancelada',
      title: 'Una tarea fue cancelada',
      body: `${assignment.document_number} · ${assignment.client_name}`,
      assignmentId: assignment.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudo cancelar la tarea.');
  }
}
