import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';
import { PHOTOS_BUCKET, signedUrls } from './storage';
import type {
  Assignment,
  AssignmentEvent,
  AssignmentStatus,
  AssignmentView,
  UserKpi,
} from './types';

const SELECT = `
  *,
  asignado:assigned_to ( name ),
  creador:created_by ( name )
`;

type Row = Assignment & {
  asignado: { name: string } | { name: string }[] | null;
  creador: { name: string } | { name: string }[] | null;
};

function nombre(value: Row['asignado']): string {
  const item = Array.isArray(value) ? value[0] : value;
  return item?.name ?? 'Sin asignar';
}

/**
 * Segundos que la tarea lleva corriendo sin contar las pausas.
 *
 * Se calcula aquí y no en la base para que la vista pueda seguir contando en
 * vivo desde el navegador a partir del mismo punto de partida.
 */
export function segundosActivos(row: Assignment, ahora = Date.now()): number {
  if (!row.started_at) return 0;

  const inicio = new Date(row.started_at).getTime();
  const fin = row.completed_at ? new Date(row.completed_at).getTime() : ahora;

  // Si está pausada ahora mismo, el tramo desde paused_at aún no está sumado.
  const pausaVigente = row.paused_at
    ? Math.max(0, (row.completed_at ? new Date(row.completed_at).getTime() : ahora) -
        new Date(row.paused_at).getTime())
    : 0;

  const total = (fin - inicio) / 1000 - row.paused_seconds - pausaVigente / 1000;
  return Math.max(0, Math.round(total));
}

export function toView(row: Row, ahora = Date.now()): AssignmentView {
  const activos = segundosActivos(row, ahora);
  const limite = row.time_limit_minutes * 60;
  const abierta = row.status === 'en_progreso' || row.status === 'pausada';

  return {
    ...(row as Assignment),
    assigned_to_name: nombre(row.asignado),
    created_by_name: nombre(row.creador),
    vencida: abierta && activos > limite,
    segundos_activos: activos,
    segundos_restantes: limite - activos,
  };
}

// ─── Consultas ──────────────────────────────────────────────────────────────

export interface AssignmentFilters {
  /** Si viene, solo las tareas de esa persona. */
  assignedTo?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export async function listAssignments(
  filters: AssignmentFilters = {},
): Promise<AssignmentView[]> {
  let query = getSupabaseAdmin()
    .from('assignments')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, filters.limit ?? 50));

  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  if (filters.status && filters.status !== 'todas') {
    if (filters.status === 'abiertas') {
      query = query.in('status', ['pendiente', 'en_progreso', 'pausada']);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  const term = filters.search?.trim().replace(/[%,()]/g, ' ').trim();
  if (term) {
    query = query.or(
      [
        `folio.ilike.%${term}%`,
        `document_number.ilike.%${term}%`,
        `client_name.ilike.%${term}%`,
        `title.ilike.%${term}%`,
      ].join(','),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const ahora = Date.now();
  return ((data ?? []) as unknown as Row[]).map((row) => toView(row, ahora));
}

export async function getAssignment(id: string): Promise<AssignmentView | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('assignments')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toView(data as unknown as Row);
}

export async function getAssignmentEvents(id: string): Promise<AssignmentEvent[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('assignment_events')
    .select('*, autor:user_id ( name )')
    .eq('assignment_id', id)
    .order('created_at');

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<
    AssignmentEvent & { autor: { name: string } | { name: string }[] | null }
  >;

  const paths = rows.map((r) => r.photo_url).filter((p): p is string => Boolean(p));
  const urls = await signedUrls(PHOTOS_BUCKET, paths);

  return rows.map((row) => {
    const autor = Array.isArray(row.autor) ? row.autor[0] : row.autor;
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      user_id: row.user_id,
      user_name: autor?.name ?? '—',
      type: row.type,
      photo_url: row.photo_url,
      photo: row.photo_url ? (urls.get(row.photo_url) ?? null) : null,
      note: row.note,
      created_at: row.created_at,
    };
  });
}

export async function countOpenAssignments(userId?: string): Promise<number> {
  let query = getSupabaseAdmin()
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendiente', 'en_progreso', 'pausada']);

  if (userId) query = query.eq('assigned_to', userId);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Notificaciones ─────────────────────────────────────────────────────────

export async function notificar(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  assignmentId?: string;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    assignment_id: params.assignmentId ?? null,
  });

  // Un aviso perdido no debe tumbar la operación principal.
  if (error) console.error('[notificar]', error.message);
}

/** Avisa a todos los jefes (hoy solo Rosendo, pero deja lugar a más). */
export async function notificarJefes(params: {
  type: string;
  title: string;
  body?: string;
  assignmentId?: string;
  excluir?: string;
}): Promise<void> {
  const { data } = await getSupabaseAdmin()
    .from('app_users')
    .select('id')
    .eq('role', 'jefe')
    .eq('active', true);

  for (const jefe of data ?? []) {
    if (jefe.id === params.excluir) continue;
    await notificar({ ...params, userId: jefe.id as string });
  }
}

// ─── KPIs ───────────────────────────────────────────────────────────────────

export async function getKpis(days = 30): Promise<UserKpi[]> {
  const { data, error } = await getSupabaseAdmin().rpc('user_kpis', { p_days: days });
  if (error) throw new Error(error.message);

  return ((data ?? []) as UserKpi[]).map((row) => ({
    ...row,
    asignadas: Number(row.asignadas ?? 0),
    completadas: Number(row.completadas ?? 0),
    en_curso: Number(row.en_curso ?? 0),
    vencidas: Number(row.vencidas ?? 0),
    a_tiempo: Number(row.a_tiempo ?? 0),
    entregas_totales: Number(row.entregas_totales ?? 0),
    pct_a_tiempo: row.pct_a_tiempo === null ? null : Number(row.pct_a_tiempo),
    minutos_promedio: row.minutos_promedio === null ? null : Number(row.minutos_promedio),
    minutos_pausa_prom:
      row.minutos_pausa_prom === null ? null : Number(row.minutos_pausa_prom),
    minutos_respuesta: row.minutos_respuesta === null ? null : Number(row.minutos_respuesta),
  }));
}

export const ESTADOS_ABIERTOS: AssignmentStatus[] = ['pendiente', 'en_progreso', 'pausada'];
