import 'server-only';
import { getSupabaseAdmin } from './supabase-admin';
import { PHOTOS_BUCKET, SIGNATURES_BUCKET } from './storage';

/**
 * Cuánto espacio ocupa el proyecto y cuánto falta para llenarlo.
 *
 * El plan Free de Supabase no avisa antes de llegar al límite, y cuando llega
 * el proyecto deja de aceptar archivos. Esto lee las cifras reales desde la
 * base (`espacio_usado`, `storage_por_mes`) y proyecta cuántos días quedan al
 * ritmo actual, para poder descargar el respaldo con tiempo.
 *
 * La proyección se hace en JavaScript por la misma razón que `getTeamOverview`
 * en `lib/assignments.ts`: son un puñado de filas, y así agregar un indicador
 * no obliga a correr otra migración.
 */

/** Límites del plan Free. Si algún día se sube a Pro, se cambian aquí. */
export const LIMITE_STORAGE = 1024 ** 3; // 1 GB
export const LIMITE_DB = 500 * 1024 ** 2; // 500 MB

/** Umbrales del aviso. */
export const AVISO_ATENCION = 70;
export const AVISO_CRITICO = 90;

/** Periodo especial: fotos de pausa, que no pertenecen a ninguna entrega. */
export const PERIODO_TAREAS = 'tareas';

export interface PeriodoEspacio {
  /** `2026-08`, o `tareas` / `otros`. */
  periodo: string;
  archivos: number;
  bytes: number;
  /** Entregas registradas en ese mes. `null` para `tareas` y `otros`. */
  entregas: number | null;
  /** Cuándo se descargó el respaldo del periodo, si ya se descargó. */
  respaldadoEn: string | null;
  /** Si ya se liberó el espacio de ese mes. */
  archivado: boolean;
}

export interface Espacio {
  bytes: number;
  limite: number;
  pct: number;
  dbBytes: number;
  dbPct: number;
  /** Meses de mayor a menor, con `tareas` y `otros` al final. */
  periodos: PeriodoEspacio[];
  /** Bytes de fotos de pausa sin entrega asociada. */
  bytesHuerfanos: number;
  /** Bytes agregados en los últimos 30 días. */
  ritmoMensual: number;
  /** Días hasta llenar el límite al ritmo actual. `null` si no hay ritmo. */
  diasRestantes: number | null;
  /** Peso medio de una entrega, para estimar cuántas más caben. */
  bytesPorEntrega: number | null;
  entregasRestantes: number | null;
}

interface BucketRow {
  bucket: string;
  archivos: number;
  bytes: number;
}

interface UsoRow {
  db_bytes: number;
  buckets: BucketRow[];
}

interface MesRow {
  periodo: string;
  archivos: number;
  bytes: number;
}

/** `2026-08` a partir de una fecha ISO, en hora local de operación. */
function periodoDe(iso: string): string {
  return iso.slice(0, 7);
}

/** Los meses van primero y en orden inverso; `tareas` y `otros` al final. */
function ordenar(a: PeriodoEspacio, b: PeriodoEspacio): number {
  const esMes = (p: string) => /^\d{4}-\d{2}$/.test(p);
  if (esMes(a.periodo) !== esMes(b.periodo)) return esMes(a.periodo) ? -1 : 1;
  return b.periodo.localeCompare(a.periodo);
}

export async function getEspacio(): Promise<Espacio> {
  const supabase = getSupabaseAdmin();

  const [uso, meses, entregas, respaldos] = await Promise.all([
    supabase.rpc('espacio_usado'),
    supabase.rpc('storage_por_mes'),
    supabase.from('deliveries').select('created_at, photos_archived_at'),
    supabase.from('backup_log').select('periodo, downloaded_at'),
  ]);

  if (uso.error) throw new Error(uso.error.message);
  if (meses.error) throw new Error(meses.error.message);
  if (entregas.error) throw new Error(entregas.error.message);
  if (respaldos.error) throw new Error(respaldos.error.message);

  const datos = (uso.data ?? { db_bytes: 0, buckets: [] }) as UsoRow;
  const buckets = datos.buckets ?? [];

  // Solo cuentan los buckets de la app: si el proyecto tuviera otros, no son
  // responsabilidad de este panel.
  const bytes = buckets
    .filter((b) => b.bucket === PHOTOS_BUCKET || b.bucket === SIGNATURES_BUCKET)
    .reduce((suma, b) => suma + Number(b.bytes ?? 0), 0);

  // ── Entregas y respaldos por mes ──────────────────────────────────────────
  const porMes = new Map<string, { entregas: number; archivadas: number }>();
  for (const fila of entregas.data ?? []) {
    const clave = periodoDe(fila.created_at as string);
    const actual = porMes.get(clave) ?? { entregas: 0, archivadas: 0 };
    actual.entregas += 1;
    if (fila.photos_archived_at) actual.archivadas += 1;
    porMes.set(clave, actual);
  }

  const respaldadoEn = new Map<string, string>();
  for (const fila of respaldos.data ?? []) {
    respaldadoEn.set(fila.periodo as string, fila.downloaded_at as string);
  }

  // Un mes puede aparecer solo en la base (ya archivado, sin archivos) o solo
  // en Storage (sin entregas, como `tareas`): se unen las dos fuentes.
  const claves = new Set<string>([
    ...((meses.data ?? []) as MesRow[]).map((m) => m.periodo),
    ...porMes.keys(),
  ]);

  const conArchivos = new Map(
    ((meses.data ?? []) as MesRow[]).map((m) => [m.periodo, m]),
  );

  const periodos: PeriodoEspacio[] = [...claves]
    .map((periodo) => {
      const almacen = conArchivos.get(periodo);
      const base = porMes.get(periodo);
      const esMes = /^\d{4}-\d{2}$/.test(periodo);

      return {
        periodo,
        archivos: Number(almacen?.archivos ?? 0),
        bytes: Number(almacen?.bytes ?? 0),
        entregas: esMes ? (base?.entregas ?? 0) : null,
        respaldadoEn: respaldadoEn.get(periodo) ?? null,
        archivado: Boolean(base && base.entregas > 0 && base.archivadas === base.entregas),
      };
    })
    .sort(ordenar);

  const bytesHuerfanos =
    periodos.find((p) => p.periodo === PERIODO_TAREAS)?.bytes ?? 0;

  // ── Ritmo y proyección ────────────────────────────────────────────────────
  // El ritmo sale de las entregas de los últimos 30 días multiplicadas por el
  // peso medio observado. Usar el peso real (y no una constante) hace que la
  // proyección se corrija sola conforme cambia el tamaño de las fotos.
  const vivas = (entregas.data ?? []).filter((e) => !e.photos_archived_at);
  const bytesEvidencias = periodos
    .filter((p) => /^\d{4}-\d{2}$/.test(p.periodo))
    .reduce((suma, p) => suma + p.bytes, 0);

  const bytesPorEntrega = vivas.length ? Math.round(bytesEvidencias / vivas.length) : null;

  const hace30 = Date.now() - 30 * 86_400_000;
  const recientes = (entregas.data ?? []).filter(
    (e) => new Date(e.created_at as string).getTime() >= hace30,
  ).length;

  const ritmoMensual = bytesPorEntrega ? recientes * bytesPorEntrega : 0;
  const libre = Math.max(LIMITE_STORAGE - bytes, 0);

  return {
    bytes,
    limite: LIMITE_STORAGE,
    pct: Math.round((bytes / LIMITE_STORAGE) * 100),
    dbBytes: Number(datos.db_bytes ?? 0),
    dbPct: Math.round((Number(datos.db_bytes ?? 0) / LIMITE_DB) * 100),
    periodos,
    bytesHuerfanos,
    ritmoMensual,
    diasRestantes: ritmoMensual > 0 ? Math.floor((libre / ritmoMensual) * 30) : null,
    bytesPorEntrega,
    entregasRestantes: bytesPorEntrega ? Math.floor(libre / bytesPorEntrega) : null,
  };
}

/**
 * Versión mínima para el aviso del layout.
 *
 * Corre en cada carga de página, así que pide solo el total (una consulta en
 * vez de cuatro) y lo guarda cinco minutos: el espacio no cambia de un clic a
 * otro, y así navegar por la app no dispara una consulta extra cada vez.
 */
const CACHE_MS = 5 * 60_000;
let resumenCache: { pct: number; expira: number } | null = null;

export async function getEspacioPct(): Promise<number> {
  if (resumenCache && resumenCache.expira > Date.now()) return resumenCache.pct;

  const { data, error } = await getSupabaseAdmin().rpc('espacio_usado');
  if (error) throw new Error(error.message);

  const buckets = ((data ?? { buckets: [] }) as UsoRow).buckets ?? [];
  const bytes = buckets
    .filter((b) => b.bucket === PHOTOS_BUCKET || b.bucket === SIGNATURES_BUCKET)
    .reduce((suma, b) => suma + Number(b.bytes ?? 0), 0);

  const pct = Math.round((bytes / LIMITE_STORAGE) * 100);
  resumenCache = { pct, expira: Date.now() + CACHE_MS };
  return pct;
}

/** El archivado y el registro de entregas invalidan el número cacheado. */
export function invalidarEspacio(): void {
  resumenCache = null;
}
