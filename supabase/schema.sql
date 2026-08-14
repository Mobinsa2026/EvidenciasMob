-- ═══════════════════════════════════════════════════════════════════════════
--  Evidencias · Control de Entregas
--  Esquema completo para Supabase / PostgreSQL
--
--  Ejecutar en:  Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede volver a ejecutar sin romper nada.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- búsqueda por similitud

-- ───────────────────────────────────────────────────────────────────────────
--  EMPLEADOS
--  Nunca se eliminan: los que dejan de trabajar se marcan active = false
--  para conservar la integridad del historial.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(120) not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists employees_active_idx on public.employees (active, name);

-- ───────────────────────────────────────────────────────────────────────────
--  CONTADOR DE FOLIOS
--  Una fila por día (zona horaria America/Chihuahua).
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.folio_counters (
  day          date primary key,
  last_number  integer not null default 0
);

-- ───────────────────────────────────────────────────────────────────────────
--  EVIDENCIAS DE ENTREGA
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.deliveries (
  id                 uuid primary key default gen_random_uuid(),
  folio              varchar(24) not null unique,
  document_type      varchar(20) not null
                       check (document_type in ('orden_trabajo', 'factura')),
  document_number    varchar(40) not null,
  client_name        varchar(120) not null,
  received_by        varchar(120),
  delivered_by       uuid not null references public.employees (id) on delete restrict,
  delivery_status    varchar(20) not null default 'completa'
                       check (delivery_status in ('completa', 'parcial', 'no_entregada')),
  title              varchar(160) not null,
  notes              text,
  signature_url      text not null,
  latitude           decimal(10, 7),
  longitude          decimal(10, 7),
  location_accuracy  decimal(10, 2),
  idempotency_key    uuid unique,
  created_at         timestamptz not null default now()
);

create index if not exists deliveries_created_at_idx   on public.deliveries (created_at desc);
create index if not exists deliveries_delivered_by_idx on public.deliveries (delivered_by);
create index if not exists deliveries_type_idx         on public.deliveries (document_type);
create index if not exists deliveries_status_idx       on public.deliveries (delivery_status);

-- Búsqueda global: folio, número, cliente, quien recibe y título.
create index if not exists deliveries_search_idx on public.deliveries
  using gin (
    (
      folio || ' ' ||
      document_number || ' ' ||
      client_name || ' ' ||
      coalesce(received_by, '') || ' ' ||
      title
    ) gin_trgm_ops
  );

-- ───────────────────────────────────────────────────────────────────────────
--  FOTOGRAFÍAS (máximo 5 por evidencia, validado en el backend)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.delivery_photos (
  id           uuid primary key default gen_random_uuid(),
  delivery_id  uuid not null references public.deliveries (id) on delete cascade,
  photo_url    text not null,
  position     integer not null default 1,
  created_at   timestamptz not null default now()
);

create index if not exists delivery_photos_delivery_idx
  on public.delivery_photos (delivery_id, position);

-- ───────────────────────────────────────────────────────────────────────────
--  GENERADOR DE FOLIOS  ·  EV-YYYYMMDD-000001
--  Atómico: el UPDATE bloquea la fila del día, evitando folios duplicados
--  cuando dos entregas se registran al mismo tiempo.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.next_folio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day    date;
  v_number integer;
begin
  v_day := (now() at time zone 'America/Chihuahua')::date;

  insert into public.folio_counters (day, last_number)
  values (v_day, 1)
  on conflict (day)
    do update set last_number = public.folio_counters.last_number + 1
  returning last_number into v_number;

  return 'EV-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  ESTADÍSTICAS DEL DASHBOARD (hoy / semana / total) en una sola consulta
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.delivery_stats()
returns table (today bigint, this_week bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with local as (
    select (created_at at time zone 'America/Chihuahua')::date as d from public.deliveries
  ), hoy as (
    select (now() at time zone 'America/Chihuahua')::date as d
  )
  select
    count(*) filter (where local.d = hoy.d),
    count(*) filter (where local.d >= date_trunc('week', hoy.d)::date),
    count(*)
  from local, hoy;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  SEGURIDAD
--  RLS activo y SIN policies: ningún cliente anónimo puede leer ni escribir.
--  El acceso ocurre exclusivamente desde el backend con la service role key,
--  que omite RLS por diseño.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.employees       enable row level security;
alter table public.deliveries      enable row level security;
alter table public.delivery_photos enable row level security;
alter table public.folio_counters  enable row level security;

revoke all on function public.next_folio()     from anon, authenticated;
revoke all on function public.delivery_stats() from anon, authenticated;
