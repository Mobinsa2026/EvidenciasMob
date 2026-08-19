import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';
import { PHOTOS_BUCKET, SIGNATURES_BUCKET, signedUrl, signedUrls } from './storage';
import { TIME_ZONE } from './format';
import type {
  Delivery,
  DeliveryListItem,
  DeliveryStats,
  DeliveryView,
  Employee,
} from './types';

/** Columnas + join de empleado y conteo de fotos. */
const LIST_SELECT = `
  id, folio, document_type, document_number, client_name, received_by,
  delivery_status, title, created_at,
  employees:delivered_by ( name ),
  delivery_photos ( count )
`;

type ListRow = Omit<DeliveryListItem, 'employee_name' | 'photo_count'> & {
  employees: { name: string } | { name: string }[] | null;
  delivery_photos: { count: number }[] | null;
};

function mapListRow(row: ListRow): DeliveryListItem {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return {
    id: row.id,
    folio: row.folio,
    document_type: row.document_type,
    document_number: row.document_number,
    client_name: row.client_name,
    received_by: row.received_by,
    delivery_status: row.delivery_status,
    title: row.title,
    created_at: row.created_at,
    employee_name: employee?.name ?? 'Sin asignar',
    photo_count: row.delivery_photos?.[0]?.count ?? 0,
  };
}

// ─── Empleados ──────────────────────────────────────────────────────────────

export async function getEmployees(onlyActive = false): Promise<Employee[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('employees').select('*').order('name');
  if (onlyActive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Employee[];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function getStats(): Promise<DeliveryStats> {
  const { data, error } = await getSupabaseAdmin().rpc('delivery_stats');
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    today: Number(row?.today ?? 0),
    this_week: Number(row?.this_week ?? 0),
    total: Number(row?.total ?? 0),
  };
}

export async function getRecentDeliveries(limit = 5): Promise<DeliveryListItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('deliveries')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ListRow[]).map(mapListRow);
}

// ─── Historial ──────────────────────────────────────────────────────────────

export interface DeliveryFilters {
  search?: string;
  documentType?: string;
  status?: string;
  employeeId?: string;
  /** `hoy` | `semana` | `mes` | `personalizada` */
  dateRange?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface DeliveryPage {
  items: DeliveryListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Inicio del día local (America/Chihuahua) expresado en UTC ISO. */
function localDayStartIso(daysBack: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const local = new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  local.setUTCDate(local.getUTCDate() - daysBack);

  // America/Chihuahua es UTC-6 todo el año desde 2022 (sin horario de verano).
  return new Date(local.getTime() + 6 * 60 * 60 * 1000).toISOString();
}

function startOfLocalWeek(): string {
  const weekday = new Date().getUTCDay(); // 0 = domingo
  const daysBack = weekday === 0 ? 6 : weekday - 1; // semana inicia el lunes
  return localDayStartIso(daysBack);
}

export async function searchDeliveries(filters: DeliveryFilters): Promise<DeliveryPage> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 12));
  const from = (page - 1) * pageSize;

  let query = getSupabaseAdmin()
    .from('deliveries')
    .select(LIST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  const search = filters.search?.trim();
  if (search) {
    const term = search.replace(/[%,()]/g, ' ').trim();
    if (term) {
      const conditions = [
        `folio.ilike.%${term}%`,
        `document_number.ilike.%${term}%`,
        `client_name.ilike.%${term}%`,
        `received_by.ilike.%${term}%`,
        `title.ilike.%${term}%`,
      ];

      // El nombre del empleado vive en otra tabla: se resuelve a ids y se
      // agrega a la misma cláusula OR.
      const { data: matches } = await getSupabaseAdmin()
        .from('employees')
        .select('id')
        .ilike('name', `%${term}%`)
        .limit(50);

      if (matches?.length) {
        conditions.push(`delivered_by.in.(${matches.map((row) => row.id).join(',')})`);
      }

      query = query.or(conditions.join(','));
    }
  }

  if (filters.documentType && filters.documentType !== 'todos') {
    query = query.eq('document_type', filters.documentType);
  }
  if (filters.status && filters.status !== 'todos') {
    query = query.eq('delivery_status', filters.status);
  }
  if (filters.employeeId && filters.employeeId !== 'todos') {
    query = query.eq('delivered_by', filters.employeeId);
  }

  switch (filters.dateRange) {
    case 'hoy':
      query = query.gte('created_at', localDayStartIso(0));
      break;
    case 'semana':
      query = query.gte('created_at', startOfLocalWeek());
      break;
    case 'mes':
      query = query.gte('created_at', localDayStartIso(29));
      break;
    case 'personalizada': {
      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00-06:00`);
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59-06:00`);
      break;
    }
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const items = ((data ?? []) as unknown as ListRow[]).map(mapListRow);
  const total = count ?? items.length;

  return { items, total, page, pageSize, hasMore: from + items.length < total };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

/**
 * Busca por UUID o por folio, para que `/evidencias/EV-20260814-000123`
 * también funcione.
 */
export async function getDelivery(idOrFolio: string): Promise<DeliveryView | null> {
  const supabase = getSupabaseAdmin();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    idOrFolio,
  );

  const { data, error } = await supabase
    .from('deliveries')
    .select('*, employees:delivered_by ( name )')
    .eq(isUuid ? 'id' : 'folio', idOrFolio)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as Delivery & { employees: { name: string } | { name: string }[] | null };
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

  const { data: photoRows, error: photoError } = await supabase
    .from('delivery_photos')
    .select('id, photo_url, thumb_url, position')
    .eq('delivery_id', row.id)
    .order('position');

  if (photoError) throw new Error(photoError.message);

  const filas = photoRows ?? [];
  const paths = filas.map((p) => p.photo_url as string);

  // Si las imágenes ya se archivaron no hay nada que firmar: pedir URLs de
  // archivos inexistentes solo gastaría llamadas.
  if (row.photos_archived_at) {
    return {
      ...row,
      employee_name: employee?.name ?? 'Sin asignar',
      photo_count: paths.length,
      photos: [],
      signature: null,
    };
  }

  // Fotos y miniaturas se firman en una sola llamada por bucket.
  const thumbPaths = filas
    .map((p) => p.thumb_url as string | null)
    .filter((p): p is string => Boolean(p));

  const urls = await signedUrls(PHOTOS_BUCKET, [...paths, ...thumbPaths]);
  const signature = await signedUrl(SIGNATURES_BUCKET, row.signature_url);

  return {
    ...row,
    employee_name: employee?.name ?? 'Sin asignar',
    photo_count: paths.length,
    photos: filas.map((p) => {
      const url = urls.get(p.photo_url as string) ?? '';
      const thumbPath = p.thumb_url as string | null;

      return {
        id: p.id as string,
        photo_url: p.photo_url as string,
        thumb_url: thumbPath,
        position: p.position as number,
        url,
        // Sin miniatura (evidencias previas a la migración 003) se usa la foto.
        thumb: (thumbPath && urls.get(thumbPath)) || url,
      };
    }),
    signature,
  };
}
