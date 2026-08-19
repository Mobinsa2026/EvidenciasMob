import { NextRequest } from 'next/server';
import {
  forbidden,
  jsonError,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { ForbiddenError, UnauthorizedError, requireJefe } from '@/lib/auth';
import { formatNumericDate, formatTime } from '@/lib/format';
import { limitBackup } from '@/lib/rate-limit';
import { PHOTOS_BUCKET, SIGNATURES_BUCKET } from '@/lib/storage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { type ZipEntry, crearZip, csv } from '@/lib/zip';

/**
 * Respaldo mensual descargable.
 *
 * El plan Free de Supabase no hace respaldos automáticos: si el proyecto se
 * pierde o alguien borra algo, no hay de dónde recuperarlo. Esto entrega un
 * ZIP con todo lo del mes —fotos, firmas y una hoja de cálculo— para guardarlo
 * fuera de Supabase.
 *
 * Descargarlo también deja constancia en `backup_log`, y esa constancia es lo
 * único que habilita después liberar el espacio de ese periodo.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

const ENCABEZADOS = [
  'Folio',
  'Tipo',
  'Documento',
  'Cliente',
  'Recibió',
  'Entregó',
  'Estado',
  'Título',
  'Fecha',
  'Hora',
  'Fotografías',
  'Latitud',
  'Longitud',
  'Observaciones',
];

const TIPO = { orden_trabajo: 'Orden de trabajo', factura: 'Factura' } as const;
const ESTADO = {
  completa: 'Completa',
  parcial: 'Parcial',
  no_entregada: 'No entregada',
} as const;

export async function GET(request: NextRequest) {
  const limit = limitBackup(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const user = await requireJefe();

    const periodo = request.nextUrl.searchParams.get('periodo') ?? '';
    if (!PERIODO.test(periodo)) {
      return jsonError('Indica el periodo a respaldar, por ejemplo 2026-08.', 422);
    }

    // Rango del mes en UTC. Basta con el mes natural: el respaldo agrupa por
    // periodo, no necesita la precisión de zona horaria de los KPIs.
    const desde = new Date(`${periodo}-01T00:00:00.000Z`);
    const hasta = new Date(desde);
    hasta.setUTCMonth(hasta.getUTCMonth() + 1);

    const supabase = getSupabaseAdmin();

    const { data: filas, error } = await supabase
      .from('deliveries')
      .select(
        `id, folio, document_type, document_number, client_name, received_by,
         delivery_status, title, notes, signature_url, latitude, longitude,
         created_at, photos_archived_at, employees:delivered_by ( name )`,
      )
      .gte('created_at', desde.toISOString())
      .lt('created_at', hasta.toISOString())
      .order('created_at');

    if (error) throw new Error(error.message);

    if (!filas?.length) {
      return jsonError('No hay entregas registradas en ese periodo.', 404);
    }

    const { data: fotos, error: fotosError } = await supabase
      .from('delivery_photos')
      .select('delivery_id, photo_url, position')
      .in(
        'delivery_id',
        filas.map((f) => f.id as string),
      )
      .order('position');

    if (fotosError) throw new Error(fotosError.message);

    const porEntrega = new Map<string, string[]>();
    for (const foto of fotos ?? []) {
      const lista = porEntrega.get(foto.delivery_id as string) ?? [];
      lista.push(foto.photo_url as string);
      porEntrega.set(foto.delivery_id as string, lista);
    }

    // ── Hoja de cálculo ───────────────────────────────────────────────────
    const tabla: unknown[][] = [ENCABEZADOS];

    for (const fila of filas) {
      const empleado = Array.isArray(fila.employees) ? fila.employees[0] : fila.employees;

      tabla.push([
        fila.folio,
        TIPO[fila.document_type as keyof typeof TIPO] ?? fila.document_type,
        fila.document_number,
        fila.client_name,
        fila.received_by ?? '',
        empleado?.name ?? '',
        ESTADO[fila.delivery_status as keyof typeof ESTADO] ?? fila.delivery_status,
        fila.title,
        formatNumericDate(fila.created_at as string),
        formatTime(fila.created_at as string),
        porEntrega.get(fila.id as string)?.length ?? 0,
        fila.latitude ?? '',
        fila.longitude ?? '',
        fila.notes ?? '',
      ]);
    }

    // ── Entradas del ZIP ──────────────────────────────────────────────────
    const entradas: ZipEntry[] = [
      { name: `entregas-${periodo}.csv`, data: csv(tabla) },
    ];

    /** Descarga diferida: el archivo solo se trae cuando toca escribirlo. */
    const traer = (bucket: string, path: string) => async () => {
      const { data, error: bajaError } = await supabase.storage.from(bucket).download(path);
      if (bajaError || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    };

    let archivos = 0;

    for (const fila of filas) {
      // Un mes ya archivado conserva su fila y su renglón en el CSV, pero sus
      // imágenes ya no están en Storage.
      if (fila.photos_archived_at) continue;

      const folio = fila.folio as string;

      for (const path of porEntrega.get(fila.id as string) ?? []) {
        entradas.push({
          name: `${folio}/${path.split('/').pop()}`,
          data: traer(PHOTOS_BUCKET, path),
        });
        archivos++;
      }

      if (fila.signature_url) {
        entradas.push({
          name: `${folio}/firma.${String(fila.signature_url).split('.').pop()}`,
          data: traer(SIGNATURES_BUCKET, fila.signature_url as string),
        });
        archivos++;
      }
    }

    // ── Constancia ────────────────────────────────────────────────────────
    // Se registra antes de transmitir: si el navegador corta la descarga a la
    // mitad, es preferible que el respaldo figure y se vuelva a bajar a que no
    // figure y el mes quede sin poder archivarse nunca.
    const { error: logError } = await supabase.from('backup_log').upsert(
      {
        periodo,
        downloaded_at: new Date().toISOString(),
        deliveries: filas.length,
        bytes: 0,
        downloaded_by: user.id,
      },
      { onConflict: 'periodo' },
    );

    if (logError) throw new Error(logError.message);

    return new Response(crearZip(entradas), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="respaldo-${periodo}.zip"`,
        'Cache-Control': 'no-store',
        'X-Entregas': String(filas.length),
        'X-Archivos': String(archivos),
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorized();
    if (error instanceof ForbiddenError) return forbidden(error.message);
    return serverError(error, 'No se pudo generar el respaldo.');
  }
}
