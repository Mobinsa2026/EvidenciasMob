import { NextRequest } from 'next/server';
import { forbidden, jsonError, jsonOk, serverError, unauthorized } from '@/lib/api';
import { UnauthorizedError, requireUser } from '@/lib/auth';
import { getAssignment, notificarJefes } from '@/lib/assignments';
import { limitWrite } from '@/lib/rate-limit';
import { PHOTOS_BUCKET, removeFiles, uploadFile } from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/validation';
import { MAX_PHOTO_BYTES } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Accion = 'iniciar' | 'pausar' | 'reanudar';

/** Acciones que no avanzan sin fotografía. Es la regla central del cronómetro. */
const EXIGEN_FOTO: Accion[] = ['pausar'];

/**
 * POST /api/assignments/[id]/eventos   (multipart/form-data)
 *
 * Campos: accion = iniciar | pausar | reanudar, nota?, foto?
 *
 * El reloj solo se detiene con evidencia: pausar sin fotografía se rechaza y la
 * tarea sigue corriendo. Así nadie puede congelar el tiempo sin comprobar dónde
 * quedó la entrega.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitWrite(request);
  if (!limit.ok) return jsonError('Demasiadas acciones seguidas. Espera un momento.', 429);

  let subida: string | null = null;

  try {
    const user = await requireUser();
    const { id } = await params;

    const assignment = await getAssignment(id);
    if (!assignment) return jsonError('La tarea no existe.', 404);

    // Solo el responsable mueve su cronómetro (el jefe puede si es suya).
    if (assignment.assigned_to !== user.id) {
      return forbidden('Esta tarea está asignada a otra persona.');
    }

    const form = await request.formData();
    const accion = sanitizeText(form.get('accion')) as Accion;
    const nota = sanitizeText(form.get('nota')).slice(0, 300) || null;
    const foto = form.get('foto');

    if (!['iniciar', 'pausar', 'reanudar'].includes(accion)) {
      return jsonError('Acción no válida.', 422);
    }

    // ── Estado esperado para cada acción ──────────────────────────────────
    const transiciones: Record<Accion, string[]> = {
      iniciar: ['pendiente'],
      pausar: ['en_progreso'],
      reanudar: ['pausada'],
    };

    if (!transiciones[accion].includes(assignment.status)) {
      return jsonError(
        `No se puede ${accion} una tarea en estado "${assignment.status}".`,
        409,
      );
    }

    // ── La foto es obligatoria para pausar ────────────────────────────────
    const esArchivo = foto instanceof File && foto.size > 0;

    if (EXIGEN_FOTO.includes(accion) && !esArchivo) {
      return jsonError(
        'Para pausar debes subir una fotografía. Sin evidencia el tiempo sigue corriendo.',
        422,
        { fields: { foto: 'Agrega una fotografía para pausar.' } },
      );
    }

    if (esArchivo) {
      const archivo = foto as File;

      if (!archivo.type.startsWith('image/')) {
        return jsonError('El archivo debe ser una imagen.', 422, {
          fields: { foto: 'El archivo debe ser una imagen.' },
        });
      }
      if (archivo.size > MAX_PHOTO_BYTES) {
        return jsonError('La fotografía es demasiado grande.', 422, {
          fields: { foto: 'La fotografía es demasiado grande.' },
        });
      }

      const extension = archivo.type.includes('webp')
        ? 'webp'
        : archivo.type.includes('png')
          ? 'png'
          : 'jpg';

      subida = `tareas/${assignment.folio}/${accion}-${Date.now()}.${extension}`;
      await uploadFile(PHOTOS_BUCKET, subida, archivo, archivo.type);
    }

    // ── Cambio de estado y contabilidad del tiempo ────────────────────────
    const supabase = getSupabaseAdmin();
    const ahora = new Date();
    const patch: Record<string, unknown> = {};
    let tipoEvento: string = accion;

    if (accion === 'iniciar') {
      patch.status = 'en_progreso';
      patch.started_at = ahora.toISOString();
      patch.due_at = new Date(
        ahora.getTime() + assignment.time_limit_minutes * 60_000,
      ).toISOString();
      tipoEvento = 'iniciada';
    }

    if (accion === 'pausar') {
      patch.status = 'pausada';
      patch.paused_at = ahora.toISOString();
      tipoEvento = 'pausada';
    }

    if (accion === 'reanudar') {
      // Al reanudar se acumula lo que duró la pausa y el plazo se recorre igual,
      // de modo que el tiempo detenido no cuenta en contra.
      const pausaSegundos = assignment.paused_at
        ? Math.max(0, Math.round((ahora.getTime() - new Date(assignment.paused_at).getTime()) / 1000))
        : 0;

      patch.status = 'en_progreso';
      patch.paused_at = null;
      patch.paused_seconds = assignment.paused_seconds + pausaSegundos;
      if (assignment.due_at) {
        patch.due_at = new Date(
          new Date(assignment.due_at).getTime() + pausaSegundos * 1000,
        ).toISOString();
      }
      tipoEvento = 'reanudada';
    }

    const { error: updateError } = await supabase
      .from('assignments')
      .update(patch)
      .eq('id', assignment.id)
      // Candado optimista: si alguien más ya cambió el estado, no se pisa.
      .eq('status', assignment.status);

    if (updateError) throw new Error(updateError.message);

    const { error: eventError } = await supabase.from('assignment_events').insert({
      assignment_id: assignment.id,
      user_id: user.id,
      type: tipoEvento,
      photo_url: subida,
      note: nota,
    });

    if (eventError) throw new Error(eventError.message);
    subida = null; // ya quedó referenciada, no hay que limpiarla

    // ── Avisos al jefe ────────────────────────────────────────────────────
    const etiqueta: Record<string, string> = {
      iniciada: 'inició',
      pausada: 'pausó',
      reanudada: 'reanudó',
    };

    await notificarJefes({
      type: `tarea_${tipoEvento}`,
      title: `${user.name} ${etiqueta[tipoEvento]} una entrega`,
      body: `${assignment.document_number} · ${assignment.client_name}`,
      assignmentId: assignment.id,
      excluir: user.id,
    });

    const actualizada = await getAssignment(assignment.id);
    return jsonOk({ assignment: actualizada });
  } catch (error) {
    if (subida) await removeFiles(PHOTOS_BUCKET, [subida]);
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudo actualizar la tarea.');
  }
}
