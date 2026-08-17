import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';
import { PHOTOS_BUCKET, signedUrls } from './storage';
import { TIME_ZONE } from './format';
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

// ─── Panel de desempeño ─────────────────────────────────────────────────────

export interface PersonaKpi {
  id: string;
  name: string;
  role: string;
  asignadas: number;
  completadas: number;
  a_tiempo: number;
  tarde: number;
  abiertas: number;
  vencidas: number;
  pct_a_tiempo: number | null;
  minutos_promedio: number | null;
  minutos_respuesta: number | null;
  minutos_pausa: number | null;
  entregas: number;
}

export interface TeamOverview {
  desde: string;
  dias: number;
  total: {
    asignadas: number;
    completadas: number;
    a_tiempo: number;
    tarde: number;
    abiertas: number;
    vencidas: number;
    pct_a_tiempo: number | null;
    minutos_promedio: number | null;
    entregas: number;
  };
  personas: PersonaKpi[];
  /** Serie temporal para la gráfica de actividad. */
  serie: Array<{ etiqueta: string; fecha: string; completadas: number; tarde: number }>;
  /** true si los puntos de la serie son semanas en vez de días. */
  porSemana: boolean;
}

const MS_DIA = 24 * 60 * 60 * 1000;

function promedio(valores: number[]): number | null {
  if (!valores.length) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/**
 * Arma el panel completo en memoria a partir de una sola consulta.
 *
 * Se calcula en JavaScript y no en SQL a propósito: son decenas de filas, y así
 * no hace falta correr otra migración cada vez que se agrega un indicador.
 */
export async function getTeamOverview(dias = 30): Promise<TeamOverview> {
  const supabase = getSupabaseAdmin();
  const desde = new Date(Date.now() - dias * MS_DIA);

  const [{ data: usuarios }, { data: filas }, { data: entregas }] = await Promise.all([
    supabase.from('app_users').select('id, name, role').eq('active', true).order('name'),
    supabase
      .from('assignments')
      .select(
        'id, assigned_to, status, created_at, started_at, completed_at, due_at, paused_seconds, time_limit_minutes',
      )
      // También las asignadas antes del periodo pero terminadas dentro de él:
      // si no, la gráfica y el resumen darían totales distintos.
      .or(`created_at.gte.${desde.toISOString()},completed_at.gte.${desde.toISOString()}`),
    supabase.from('deliveries').select('created_by').gte('created_at', desde.toISOString()),
  ]);

  const tareas = (filas ?? []) as Array<{
    id: string;
    assigned_to: string;
    status: AssignmentStatus;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    due_at: string | null;
    paused_seconds: number;
    time_limit_minutes: number;
  }>;

  const entregasPorUsuario = new Map<string, number>();
  for (const fila of entregas ?? []) {
    const id = (fila as { created_by: string | null }).created_by;
    if (id) entregasPorUsuario.set(id, (entregasPorUsuario.get(id) ?? 0) + 1);
  }

  const ahora = Date.now();

  /** Una tarea llegó tarde si su tiempo activo superó el plazo. */
  function activoMinutos(t: (typeof tareas)[number]): number | null {
    if (!t.started_at || !t.completed_at) return null;
    const bruto =
      (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000;
    return Math.max(0, bruto - t.paused_seconds) / 60;
  }

  const inicioPeriodo = desde.getTime();

  const personas: PersonaKpi[] = (usuarios ?? []).map((usuario) => {
    const suyas = tareas.filter(
      (t) =>
        t.assigned_to === usuario.id && new Date(t.created_at).getTime() >= inicioPeriodo,
    );

    // "Completadas" se cuenta por la fecha de cierre, no la de creación: es lo
    // que mide el periodo y lo que suma la gráfica de actividad.
    const completadas = tareas.filter((t) => {
      if (t.assigned_to !== usuario.id) return false;
      if (t.status !== 'completada' || !t.completed_at) return false;

      const cuando = new Date(t.completed_at).getTime();
      // El tope en `ahora` protege de un reloj desfasado entre el servidor y la
      // base: una fecha futura contaría aquí pero no en la gráfica.
      return cuando >= inicioPeriodo && cuando <= ahora;
    });

    const tiempos = completadas
      .map(activoMinutos)
      .filter((v): v is number => v !== null);

    const aTiempo = completadas.filter((t) => {
      const activo = activoMinutos(t);
      return activo !== null && activo <= t.time_limit_minutes;
    }).length;

    const abiertas = suyas.filter(
      (t) => t.status === 'en_progreso' || t.status === 'pausada' || t.status === 'pendiente',
    );

    const vencidas = abiertas.filter((t) => {
      if (!t.started_at) return false;
      const bruto = (ahora - new Date(t.started_at).getTime()) / 1000;
      return (bruto - t.paused_seconds) / 60 > t.time_limit_minutes;
    }).length;

    const respuestas = suyas
      .filter((t) => t.started_at)
      .map(
        (t) =>
          (new Date(t.started_at as string).getTime() - new Date(t.created_at).getTime()) /
          60000,
      );

    return {
      id: usuario.id as string,
      name: usuario.name as string,
      role: usuario.role as string,
      asignadas: suyas.length,
      completadas: completadas.length,
      a_tiempo: aTiempo,
      tarde: completadas.length - aTiempo,
      abiertas: abiertas.length,
      vencidas,
      pct_a_tiempo: completadas.length
        ? Math.round((aTiempo / completadas.length) * 100)
        : null,
      minutos_promedio: promedio(tiempos),
      minutos_respuesta: promedio(respuestas),
      minutos_pausa: promedio(completadas.map((t) => t.paused_seconds / 60)),
      entregas: entregasPorUsuario.get(usuario.id as string) ?? 0,
    };
  });

  // ── Serie temporal ────────────────────────────────────────────────────────
  const porSemana = dias > 31;
  const puntos = porSemana ? Math.ceil(dias / 7) : dias;
  const ancho = porSemana ? 7 : 1;

  const serie = Array.from({ length: puntos }, (_, indice) => {
    const fin = new Date(ahora - (puntos - 1 - indice) * ancho * MS_DIA);
    const inicio = new Date(fin.getTime() - (ancho - 1) * MS_DIA);

    // El primer punto absorbe lo anterior para que la suma de columnas coincida
    // exactamente con el total de completadas del resumen.
    const desdeMs = indice === 0 ? inicioPeriodo : new Date(inicio).setHours(0, 0, 0, 0);

    const hastaMs = Math.min(new Date(fin).setHours(23, 59, 59, 999), ahora);

    const enRango = tareas.filter((t) => {
      if (t.status !== 'completada' || !t.completed_at) return false;
      const cuando = new Date(t.completed_at).getTime();
      return cuando >= desdeMs && cuando <= hastaMs;
    });

    const tarde = enRango.filter((t) => {
      const activo = activoMinutos(t);
      return activo !== null && activo > t.time_limit_minutes;
    }).length;

    const formato = new Intl.DateTimeFormat('es-MX', {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: porSemana ? 'short' : undefined,
    });

    return {
      etiqueta: formato.format(fin).replace('.', ''),
      fecha: fin.toISOString(),
      completadas: enRango.length,
      tarde,
    };
  });

  const completadasTotal = personas.reduce((suma, p) => suma + p.completadas, 0);
  const aTiempoTotal = personas.reduce((suma, p) => suma + p.a_tiempo, 0);
  const todosLosTiempos = tareas
    .filter((t) => t.status === 'completada')
    .map(activoMinutos)
    .filter((v): v is number => v !== null);

  return {
    desde: desde.toISOString(),
    dias,
    total: {
      asignadas: tareas.length,
      completadas: completadasTotal,
      a_tiempo: aTiempoTotal,
      tarde: completadasTotal - aTiempoTotal,
      abiertas: personas.reduce((suma, p) => suma + p.abiertas, 0),
      vencidas: personas.reduce((suma, p) => suma + p.vencidas, 0),
      pct_a_tiempo: completadasTotal
        ? Math.round((aTiempoTotal / completadasTotal) * 100)
        : null,
      minutos_promedio: promedio(todosLosTiempos),
      entregas: personas.reduce((suma, p) => suma + p.entregas, 0),
    },
    personas,
    serie,
    porSemana,
  };
}
