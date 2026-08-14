import { NextRequest } from 'next/server';
import { jsonError, jsonOk, serverError, tooManyRequests } from '@/lib/api';
import { searchDeliveries } from '@/lib/queries';
import { limitRead, limitWrite, verifyTurnstile } from '@/lib/rate-limit';
import {
  PHOTOS_BUCKET,
  SIGNATURES_BUCKET,
  photoPath,
  removeFiles,
  signaturePath,
  uploadFile,
} from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  MAX_SIGNATURE_BYTES,
  MIN_PHOTOS,
} from '@/lib/types';
import { deliveryInputSchema, fieldErrors } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── GET /api/deliveries ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limit = limitRead(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const p = request.nextUrl.searchParams;
    const page = await searchDeliveries({
      search: p.get('search') ?? undefined,
      documentType: p.get('documentType') ?? undefined,
      status: p.get('status') ?? undefined,
      employeeId: p.get('employeeId') ?? undefined,
      dateRange: p.get('dateRange') ?? undefined,
      dateFrom: p.get('dateFrom') ?? undefined,
      dateTo: p.get('dateTo') ?? undefined,
      page: Number(p.get('page') ?? 1),
      pageSize: Number(p.get('pageSize') ?? 12),
    });

    return jsonOk(page);
  } catch (error) {
    return serverError(error, 'No se pudo cargar el historial de entregas.');
  }
}

// ─── POST /api/deliveries (multipart/form-data) ─────────────────────────────

export async function POST(request: NextRequest) {
  const limit = limitWrite(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const uploadedPhotos: string[] = [];
  let uploadedSignature: string | null = null;

  try {
    const form = await request.formData().catch(() => null);
    if (!form) return jsonError('No se recibió la información de la entrega.', 400);

    if (!(await verifyTurnstile(form.get('turnstile_token') as string | null))) {
      return jsonError('No se pudo verificar la solicitud. Recarga la página.', 403);
    }

    // 1 · Validar y sanitizar los campos de texto
    const parsed = deliveryInputSchema.safeParse({
      document_type: form.get('document_type'),
      document_number: form.get('document_number'),
      client_name: form.get('client_name'),
      received_by: form.get('received_by'),
      delivered_by: form.get('delivered_by'),
      delivery_status: form.get('delivery_status'),
      title: form.get('title'),
      notes: form.get('notes'),
      latitude: form.get('latitude'),
      longitude: form.get('longitude'),
      location_accuracy: form.get('location_accuracy'),
      idempotency_key: form.get('idempotency_key') || undefined,
    });

    if (!parsed.success) {
      return jsonError('Revisa la información capturada.', 422, {
        fields: fieldErrors(parsed.error),
      });
    }
    const input = parsed.data;

    // 2 · Fotografías
    const photos = form.getAll('photos').filter((v): v is File => v instanceof File);

    if (photos.length < MIN_PHOTOS) {
      return jsonError('Agrega al menos una fotografía de la entrega.', 422, {
        fields: { photos: 'Agrega al menos una fotografía de la entrega.' },
      });
    }
    if (photos.length > MAX_PHOTOS) {
      return jsonError(`Solo se permiten ${MAX_PHOTOS} fotografías.`, 422, {
        fields: { photos: `Solo se permiten ${MAX_PHOTOS} fotografías.` },
      });
    }
    for (const photo of photos) {
      if (!photo.type.startsWith('image/')) {
        return jsonError('Uno de los archivos no es una imagen válida.', 422, {
          fields: { photos: 'Uno de los archivos no es una imagen válida.' },
        });
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return jsonError('Alguna fotografía excede el tamaño permitido.', 413, {
          fields: { photos: 'Alguna fotografía excede el tamaño permitido.' },
        });
      }
    }

    // 3 · Firma
    const signature = form.get('signature');
    if (!(signature instanceof File) || signature.size === 0) {
      return jsonError('Falta la firma de entrega.', 422, {
        fields: { signature: 'Registra la firma de entrega.' },
      });
    }
    if (!signature.type.startsWith('image/') || signature.size > MAX_SIGNATURE_BYTES) {
      return jsonError('La firma no es válida.', 422, {
        fields: { signature: 'La firma no es válida. Vuelve a firmar.' },
      });
    }

    const supabase = getSupabaseAdmin();

    // 4 · Protección contra envíos duplicados (doble tap, reintento de red)
    if (input.idempotency_key) {
      const { data: existing } = await supabase
        .from('deliveries')
        .select('id, folio, created_at')
        .eq('idempotency_key', input.idempotency_key)
        .maybeSingle();

      if (existing) {
        return jsonOk({ delivery: existing, duplicated: true }, 200);
      }
    }

    // 5 · El empleado debe existir y estar activo
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name, active')
      .eq('id', input.delivered_by)
      .maybeSingle();

    if (!employee || !employee.active) {
      return jsonError('El empleado seleccionado no está disponible.', 422, {
        fields: { delivered_by: 'Selecciona un empleado activo.' },
      });
    }

    // 6 · Folio atómico generado por PostgreSQL
    const { data: folioData, error: folioError } = await supabase.rpc('next_folio');
    if (folioError || !folioData) {
      throw new Error(folioError?.message ?? 'No se pudo generar el folio.');
    }
    const folio = String(folioData);

    // 7 · Subida de archivos
    const signatureKey = signaturePath(folio, signature.type);
    await uploadFile(SIGNATURES_BUCKET, signatureKey, signature, signature.type);
    uploadedSignature = signatureKey;

    for (let i = 0; i < photos.length; i++) {
      const key = photoPath(folio, i + 1, photos[i].type);
      await uploadFile(PHOTOS_BUCKET, key, photos[i], photos[i].type);
      uploadedPhotos.push(key);
    }

    // 8 · Registro en base de datos (created_at lo pone el servidor)
    const { data: delivery, error: insertError } = await supabase
      .from('deliveries')
      .insert({
        folio,
        document_type: input.document_type,
        document_number: input.document_number,
        client_name: input.client_name,
        received_by: input.received_by ?? null,
        delivered_by: input.delivered_by,
        delivery_status: input.delivery_status,
        title: input.title,
        notes: input.notes ?? null,
        signature_url: signatureKey,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_accuracy: input.location_accuracy ?? null,
        idempotency_key: input.idempotency_key ?? null,
      })
      .select('id, folio, created_at')
      .single();

    if (insertError || !delivery) {
      throw new Error(insertError?.message ?? 'No se pudo registrar la evidencia.');
    }

    const { error: photosError } = await supabase.from('delivery_photos').insert(
      uploadedPhotos.map((path, index) => ({
        delivery_id: delivery.id,
        photo_url: path,
        position: index + 1,
      })),
    );

    if (photosError) {
      // La evidencia sin fotos no es válida: se revierte por completo.
      await supabase.from('deliveries').delete().eq('id', delivery.id);
      throw new Error(photosError.message);
    }

    return jsonOk(
      {
        delivery: {
          id: delivery.id,
          folio: delivery.folio,
          created_at: delivery.created_at,
          employee_name: employee.name,
          photo_count: uploadedPhotos.length,
        },
      },
      201,
    );
  } catch (error) {
    // Limpieza best-effort de lo que sí alcanzó a subirse.
    await removeFiles(PHOTOS_BUCKET, uploadedPhotos);
    if (uploadedSignature) await removeFiles(SIGNATURES_BUCKET, [uploadedSignature]);
    return serverError(error, 'No se pudo registrar la evidencia. Inténtalo de nuevo.');
  }
}
