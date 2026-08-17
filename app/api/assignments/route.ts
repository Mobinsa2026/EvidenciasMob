import { NextRequest } from 'next/server';
import { z } from 'zod';
import { forbidden, jsonError, jsonOk, serverError, unauthorized } from '@/lib/api';
import {
  ForbiddenError,
  UnauthorizedError,
  requireJefe,
  requireUser,
} from '@/lib/auth';
import { listAssignments, notificar } from '@/lib/assignments';
import { limitWrite } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fieldErrors, sanitizeText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const text = (max: number) =>
  z.preprocess(sanitizeText, z.string().max(max, `Máximo ${max} caracteres.`));

const optionalText = (max: number) =>
  z.preprocess((v) => {
    const clean = sanitizeText(v);
    return clean.length ? clean : undefined;
  }, z.string().max(max).optional());

const nuevaTareaSchema = z.object({
  document_type: z.enum(['orden_trabajo', 'factura'], {
    errorMap: () => ({ message: 'Selecciona el tipo de documento.' }),
  }),
  document_number: text(40).pipe(z.string().min(2, 'Ingresa el número de la orden o factura.')),
  client_name: text(120).pipe(z.string().min(2, 'Ingresa el nombre del cliente.')),
  title: text(160).pipe(z.string().min(3, 'Ingresa un título para la tarea.')),
  instructions: optionalText(600),
  address: optionalText(240),
  assigned_to: z.string().uuid('Selecciona a quién se le asigna.'),
  time_limit_minutes: z.coerce
    .number()
    .int()
    .min(5, 'El plazo mínimo es de 5 minutos.')
    .max(2880, 'El plazo máximo es de 48 horas.'),
});

/** GET /api/assignments — el jefe ve todas; el asistente, solo las suyas. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const params = request.nextUrl.searchParams;

    // Un asistente nunca puede consultar las tareas de otro.
    const assignedTo =
      user.role === 'jefe' ? (params.get('assignedTo') ?? undefined) : user.id;

    const assignments = await listAssignments({
      assignedTo: assignedTo === 'todos' ? undefined : assignedTo,
      status: params.get('status') ?? undefined,
      search: params.get('search') ?? undefined,
      limit: Number(params.get('limit') ?? 50),
    });

    return jsonOk({ assignments, total: assignments.length });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    return serverError(error, 'No se pudieron cargar las tareas.');
  }
}

/** POST /api/assignments — solo el jefe asigna entregas. */
export async function POST(request: NextRequest) {
  const limit = limitWrite(request);
  if (!limit.ok) {
    return jsonError('Demasiadas tareas seguidas. Espera un momento.', 429);
  }

  try {
    const jefe = await requireJefe();
    const parsed = nuevaTareaSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return jsonError('Revisa la información capturada.', 422, {
        fields: fieldErrors(parsed.error),
      });
    }

    const input = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: destinatario, error: userError } = await supabase
      .from('app_users')
      .select('id, name, active')
      .eq('id', input.assigned_to)
      .maybeSingle();

    if (userError) throw new Error(userError.message);
    if (!destinatario || !destinatario.active) {
      return jsonError('La persona seleccionada no está disponible.', 422, {
        fields: { assigned_to: 'Selecciona a alguien activo.' },
      });
    }

    const { data: folioData, error: folioError } = await supabase.rpc(
      'next_assignment_folio',
    );
    if (folioError) throw new Error(folioError.message);

    const { data: created, error: insertError } = await supabase
      .from('assignments')
      .insert({
        folio: folioData as string,
        document_type: input.document_type,
        document_number: input.document_number,
        client_name: input.client_name,
        title: input.title,
        instructions: input.instructions ?? null,
        address: input.address ?? null,
        assigned_to: input.assigned_to,
        created_by: jefe.id,
        time_limit_minutes: input.time_limit_minutes,
        status: 'pendiente',
      })
      .select('id, folio')
      .single();

    if (insertError) throw new Error(insertError.message);

    await supabase.from('assignment_events').insert({
      assignment_id: created.id,
      user_id: jefe.id,
      type: 'asignada',
      note: `Plazo de ${input.time_limit_minutes} minutos.`,
    });

    const horas = Math.floor(input.time_limit_minutes / 60);
    const minutos = input.time_limit_minutes % 60;
    const plazo = horas
      ? `${horas} h${minutos ? ` ${minutos} min` : ''}`
      : `${minutos} min`;

    await notificar({
      userId: input.assigned_to,
      type: 'tarea_asignada',
      title: 'Nueva entrega asignada',
      body: `${input.document_number} · ${input.client_name} · plazo de ${plazo}`,
      assignmentId: created.id as string,
    });

    return jsonOk({ assignment: created }, 201);
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    if (error instanceof ForbiddenError) return forbidden('Solo el jefe puede asignar entregas.');
    return serverError(error, 'No se pudo crear la tarea.');
  }
}
