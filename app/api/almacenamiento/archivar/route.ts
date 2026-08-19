import { NextRequest } from 'next/server';
import {
  forbidden,
  jsonError,
  jsonOk,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { checkAdminPassword, isDeleteEnabled } from '@/lib/admin-auth';
import { ForbiddenError, UnauthorizedError, requireJefe } from '@/lib/auth';
import { invalidarEspacio } from '@/lib/espacio';
import { limitWrite } from '@/lib/rate-limit';
import { PHOTOS_BUCKET, SIGNATURES_BUCKET, removeFiles } from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Libera el espacio de un periodo ya respaldado.
 *
 * Borra únicamente los archivos de Storage. Las filas de `deliveries` y
 * `delivery_photos` se conservan intactas: el folio, el cliente, quién entregó
 * y la fecha siguen en el historial y en los KPIs; lo que se marca es que sus
 * imágenes viven ahora en el respaldo descargado.
 *
 * Dos candados, ambos obligatorios:
 *   1. La contraseña de administración (la misma del borrado de evidencias).
 *   2. Una constancia de respaldo en `backup_log` para ese periodo.
 *
 * Sin el segundo candado esto sería una forma silenciosa de perder evidencia,
 * que es justo lo que se quiere evitar.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(request: NextRequest) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    await requireJefe();

    if (!isDeleteEnabled()) {
      return jsonError(
        'Falta configurar DELETE_PASSWORD en el servidor para poder liberar espacio.',
        503,
      );
    }

    const body = (await request.json().catch(() => null)) as {
      periodo?: unknown;
      password?: unknown;
    } | null;

    const periodo = typeof body?.periodo === 'string' ? body.periodo : '';
    if (!PERIODO.test(periodo)) {
      return jsonError('Indica el periodo a liberar, por ejemplo 2026-08.', 422);
    }

    if (!checkAdminPassword(body?.password)) {
      return jsonError('Contraseña incorrecta.', 401, {
        fields: { password: 'Contraseña incorrecta.' },
      });
    }

    const supabase = getSupabaseAdmin();

    // ── Candado: el respaldo debe existir ─────────────────────────────────
    const { data: respaldo, error: respaldoError } = await supabase
      .from('backup_log')
      .select('periodo, downloaded_at')
      .eq('periodo', periodo)
      .maybeSingle();

    if (respaldoError) throw new Error(respaldoError.message);

    if (!respaldo) {
      return jsonError(
        'Primero descarga el respaldo de ese periodo. Sin respaldo no se libera espacio.',
        409,
      );
    }

    // ── Entregas del periodo ──────────────────────────────────────────────
    const desde = new Date(`${periodo}-01T00:00:00.000Z`);
    const hasta = new Date(desde);
    hasta.setUTCMonth(hasta.getUTCMonth() + 1);

    const { data: filas, error } = await supabase
      .from('deliveries')
      .select('id, signature_url')
      .gte('created_at', desde.toISOString())
      .lt('created_at', hasta.toISOString())
      .is('photos_archived_at', null);

    if (error) throw new Error(error.message);

    if (!filas?.length) {
      return jsonError('Ese periodo ya está archivado o no tiene entregas.', 409);
    }

    const ids = filas.map((f) => f.id as string);

    const { data: fotos, error: fotosError } = await supabase
      .from('delivery_photos')
      .select('photo_url, thumb_url')
      .in('delivery_id', ids);

    if (fotosError) throw new Error(fotosError.message);

    // Fotos y miniaturas viven en el mismo bucket.
    const rutasFotos = (fotos ?? []).flatMap((f) =>
      [f.photo_url as string, f.thumb_url as string | null].filter(
        (r): r is string => Boolean(r),
      ),
    );
    const rutasFirmas = filas
      .map((f) => f.signature_url as string | null)
      .filter((r): r is string => Boolean(r));

    await removeFiles(PHOTOS_BUCKET, rutasFotos);
    await removeFiles(SIGNATURES_BUCKET, rutasFirmas);

    const { error: marcaError } = await supabase
      .from('deliveries')
      .update({ photos_archived_at: new Date().toISOString() })
      .in('id', ids);

    if (marcaError) throw new Error(marcaError.message);

    // ── De paso, las fotos de pausa que ya no le sirven a nadie ───────────
    const huerfanas = await limpiarFotosDePausa(hasta);

    invalidarEspacio();

    return jsonOk({
      periodo,
      entregas: filas.length,
      archivos: rutasFotos.length + rutasFirmas.length,
      fotos_de_pausa: huerfanas,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    if (error instanceof ForbiddenError) return forbidden(error.message);
    return serverError(error, 'No se pudo liberar el espacio.');
  }
}

/**
 * Borra las fotos de pausa de tareas ya cerradas antes del corte.
 *
 * Estas imágenes solo sirven para comprobar que el cronómetro se detuvo con
 * evidencia real. Una vez que la tarea terminó y su mes está respaldado, no
 * vuelven a consultarse — pero nadie las borraba, así que se acumulaban para
 * siempre en `tareas/`.
 */
async function limpiarFotosDePausa(corte: Date): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: cerradas } = await supabase
    .from('assignments')
    .select('id')
    .in('status', ['completada', 'cancelada'])
    .lt('created_at', corte.toISOString());

  if (!cerradas?.length) return 0;

  const { data: eventos } = await supabase
    .from('assignment_events')
    .select('id, photo_url')
    .in(
      'assignment_id',
      cerradas.map((t) => t.id as string),
    )
    .not('photo_url', 'is', null)
    .is('photo_archived_at', null);

  // Solo las que están bajo `tareas/`: las de tipo `completada` apuntan a la
  // foto de la evidencia, que se maneja con su propio periodo.
  const pendientes = (eventos ?? []).filter((e) =>
    String(e.photo_url).startsWith('tareas/'),
  );

  if (!pendientes.length) return 0;

  await removeFiles(
    PHOTOS_BUCKET,
    pendientes.map((e) => e.photo_url as string),
  );

  // `photo_url` se conserva: es la constancia de que hubo fotografía, y la
  // restricción de la base la exige. Lo que se marca es que el archivo ya no
  // está en Storage sino en el respaldo.
  await supabase
    .from('assignment_events')
    .update({ photo_archived_at: new Date().toISOString() })
    .in(
      'id',
      pendientes.map((e) => e.id as string),
    );

  return pendientes.length;
}
