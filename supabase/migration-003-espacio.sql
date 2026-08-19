-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRACIÓN 003 · CONTROL DE ESPACIO Y RESPALDOS
--
--  Ejecutar en el SQL Editor de Supabase después de
--  migration-002-usuarios-tareas.sql. Es idempotente: se puede correr varias
--  veces sin romper nada.
--
--  Qué agrega:
--    · Funciones para saber cuánto espacio ocupa el proyecto, sin salir de la
--      base y sin depender del panel de Supabase.
--    · Columnas para las miniaturas y para marcar fotos ya archivadas.
--    · Bitácora de respaldos: sin respaldo descargado no se libera espacio.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
--  MINIATURAS
--  Cada foto guarda además una versión de 320 px. La galería usa esa, y la
--  foto completa solo se descarga al abrirla. Es opcional: las evidencias
--  registradas antes de esta migración se quedan en null y siguen funcionando.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.delivery_photos
  add column if not exists thumb_url text;

-- ───────────────────────────────────────────────────────────────────────────
--  ARCHIVADO
--  Cuando se libera el espacio de un periodo, la fila de la entrega NO se
--  borra: se marca la fecha en que sus imágenes pasaron al respaldo. Así el
--  historial, los folios y los KPIs quedan completos.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.deliveries
  add column if not exists photos_archived_at timestamptz;

-- Lo mismo para las fotos de pausa, que hasta ahora no las borraba nadie y se
-- acumulaban para siempre en `tareas/`.
--
-- Aquí NO se pone `photo_url` en null a propósito: la restricción
-- `assignment_events_foto_obligatoria` es la garantía de que un cronómetro
-- nunca se detuvo sin fotografía, y esa garantía debe sobrevivir al archivado.
-- La ruta se conserva como constancia de que la foto existió; esta columna
-- dice que el archivo ya vive en el respaldo.
alter table public.assignment_events
  add column if not exists photo_archived_at timestamptz;

-- ───────────────────────────────────────────────────────────────────────────
--  BITÁCORA DE RESPALDOS
--  Una fila por periodo descargado. Es la llave que habilita liberar espacio:
--  sin respaldo registrado, el archivado responde 409.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.backup_log (
  periodo       varchar(7) primary key,          -- '2026-08'
  downloaded_at timestamptz not null default now(),
  deliveries    integer     not null default 0,
  bytes         bigint      not null default 0,
  downloaded_by uuid        references public.app_users (id) on delete set null
);

alter table public.backup_log enable row level security;

-- ───────────────────────────────────────────────────────────────────────────
--  ESPACIO USADO
--  Suma el tamaño real de los objetos en Storage leyendo storage.objects, más
--  el peso de la base. `security definer` porque el esquema storage no es
--  accesible de otro modo desde PostgREST.
--
--  Devuelve jsonb en vez de columnas para poder agregar indicadores después
--  sin otra migración:
--    { "db_bytes": 28311552,
--      "buckets": [ { "bucket": "delivery-photos", "archivos": 120,
--                     "bytes": 41943040 }, ... ] }
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.espacio_usado()
returns jsonb
language sql
stable
security definer
set search_path = public, storage
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'buckets', coalesce(
      (
        select jsonb_agg(b order by b->>'bucket')
        from (
          -- sum() sobre bigint devuelve numeric: se regresa a bigint para que
          -- el JSON no salga con decimales.
          select jsonb_build_object(
            'bucket',   o.bucket_id,
            'archivos', count(*),
            'bytes',    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
          ) as b
          from storage.objects o
          group by o.bucket_id
        ) agrupado
      ),
      '[]'::jsonb
    )
  );
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  ESPACIO POR PERIODO
--  Las rutas de evidencias empiezan con 'YYYY/MM/', así que el mes sale del
--  propio nombre del archivo. Las fotos de pausa viven en 'tareas/' y se
--  agrupan aparte: no pertenecen a ninguna entrega y por eso nunca se
--  limpiaban solas.
--
--  periodo: '2026-08' para evidencias, 'tareas' para las fotos de pausa,
--           'otros' para cualquier ruta inesperada.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.storage_por_mes()
returns table (periodo text, archivos bigint, bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    case
      when o.name like 'tareas/%'          then 'tareas'
      when o.name ~ '^\d{4}/\d{2}/'        then replace(substring(o.name from 1 for 7), '/', '-')
      else 'otros'
    end as periodo,
    count(*)                                                  as archivos,
    -- El cast es necesario: sum() de bigint devuelve numeric y la firma de la
    -- función declara bigint.
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint   as bytes
  from storage.objects o
  group by 1
  order by 1 desc;
$$;
