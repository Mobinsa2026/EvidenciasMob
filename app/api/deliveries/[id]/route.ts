import { NextRequest } from 'next/server';
import { jsonError, jsonOk, serverError, tooManyRequests } from '@/lib/api';
import { checkAdminPassword, isDeleteEnabled } from '@/lib/admin-auth';
import { getDelivery } from '@/lib/queries';
import { limitDelete, limitRead } from '@/lib/rate-limit';
import { PHOTOS_BUCKET, SIGNATURES_BUCKET, removeFiles } from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** GET /api/deliveries/[id] — acepta UUID o folio. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitRead(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const { id } = await params;
    const delivery = await getDelivery(id);
    if (!delivery) return jsonError('La evidencia no existe.', 404);

    return jsonOk({ delivery });
  } catch (error) {
    return serverError(error, 'No se pudo cargar la evidencia.');
  }
}

/**
 * DELETE /api/deliveries/[id]  { password }
 *
 * Borrado definitivo: elimina las fotografías y la firma de Storage y luego el
 * registro (las filas de delivery_photos caen por CASCADE).
 * Requiere la contraseña de administración, validada aquí en el servidor.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = limitDelete(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    if (!isDeleteEnabled()) {
      return jsonError(
        'El borrado de evidencias no está habilitado en este servidor.',
        503,
      );
    }

    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;

    if (!checkAdminPassword(body?.password)) {
      return jsonError('Contraseña incorrecta.', 401, {
        fields: { password: 'Contraseña incorrecta.' },
      });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: delivery, error: findError } = await supabase
      .from('deliveries')
      .select('id, folio, signature_url')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    if (!delivery) return jsonError('La evidencia no existe.', 404);

    const { data: photos } = await supabase
      .from('delivery_photos')
      .select('photo_url')
      .eq('delivery_id', delivery.id);

    const { error: deleteError } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', delivery.id);

    if (deleteError) throw new Error(deleteError.message);

    // Los archivos se borran después: si esto fallara, quedan huérfanos pero el
    // registro ya no existe, que es lo que pidió el usuario.
    await removeFiles(
      PHOTOS_BUCKET,
      (photos ?? []).map((photo) => photo.photo_url as string),
    );
    await removeFiles(SIGNATURES_BUCKET, [delivery.signature_url]);

    return jsonOk({ deleted: true, folio: delivery.folio });
  } catch (error) {
    return serverError(error, 'No se pudo eliminar la evidencia.');
  }
}
