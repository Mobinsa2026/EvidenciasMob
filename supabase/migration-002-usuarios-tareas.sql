-- ═══════════════════════════════════════════════════════════════════════════
--  Migración 002 · Usuarios con rol, tareas asignadas, notificaciones y KPIs
--
--  Ejecutar en:  Supabase → SQL Editor → New query → Run
--  Requiere haber ejecutado antes schema.sql. Es idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────────────────
--  USUARIOS DEL SISTEMA
--
--  Se separan de `employees` a propósito: `employees` es el catálogo de quién
--  puede aparecer como responsable de una entrega (histórico, nunca se borra);
--  `app_users` es quién puede iniciar sesión. Se enlazan con employee_id.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.app_users (
  id             uuid primary key default gen_random_uuid(),
  name           varchar(120) not null,
  username       varchar(40) not null unique,
  password_hash  text not null,
  role           varchar(20) not null default 'asistente'
                   check (role in ('jefe', 'asistente')),
  employee_id    uuid references public.employees (id) on delete set null,
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists app_users_username_idx on public.app_users (lower(username));

-- ───────────────────────────────────────────────────────────────────────────
--  TAREAS ASIGNADAS
--
--  El jefe crea la tarea con un plazo en minutos. El cronómetro arranca cuando
--  el asistente la inicia (no cuando se asigna), por eso started_at y due_at
--  son nulos hasta ese momento.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  folio               varchar(24) not null unique,
  document_type       varchar(20) not null
                        check (document_type in ('orden_trabajo', 'factura')),
  document_number     varchar(40) not null,
  client_name         varchar(120) not null,
  title               varchar(160) not null,
  instructions        text,
  address             varchar(240),

  assigned_to         uuid not null references public.app_users (id) on delete restrict,
  created_by          uuid not null references public.app_users (id) on delete restrict,

  time_limit_minutes  integer not null default 120 check (time_limit_minutes between 5 and 2880),

  status              varchar(20) not null default 'pendiente'
                        check (status in ('pendiente', 'en_progreso', 'pausada', 'completada', 'cancelada')),

  started_at          timestamptz,
  due_at              timestamptz,
  completed_at        timestamptz,

  -- Segundos acumulados en pausa. El tiempo activo se calcula restándolos.
  paused_seconds      integer not null default 0,
  -- Marca del inicio de la pausa vigente (null si no está pausada).
  paused_at           timestamptz,

  delivery_id         uuid references public.deliveries (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists assignments_assigned_to_idx on public.assignments (assigned_to, status);
create index if not exists assignments_status_idx      on public.assignments (status, created_at desc);
create index if not exists assignments_created_at_idx  on public.assignments (created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
--  BITÁCORA DE LA TAREA
--
--  Cada cambio del cronómetro queda registrado. Pausar y completar exigen
--  fotografía: sin foto el backend rechaza la operación y el reloj sigue
--  corriendo. Así no se puede "congelar" el tiempo sin evidencia.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.assignment_events (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  user_id        uuid not null references public.app_users (id) on delete restrict,
  type           varchar(20) not null
                   check (type in ('asignada', 'iniciada', 'pausada', 'reanudada', 'completada', 'cancelada')),
  photo_url      text,
  note           varchar(300),
  created_at     timestamptz not null default now()
);

create index if not exists assignment_events_assignment_idx
  on public.assignment_events (assignment_id, created_at);

-- Regla dura a nivel de base de datos: pausar y completar necesitan foto.
alter table public.assignment_events
  drop constraint if exists assignment_events_foto_obligatoria;

alter table public.assignment_events
  add constraint assignment_events_foto_obligatoria
  check (type not in ('pausada', 'completada') or photo_url is not null);

-- ───────────────────────────────────────────────────────────────────────────
--  NOTIFICACIONES POR USUARIO
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.app_users (id) on delete cascade,
  type           varchar(30) not null,
  title          varchar(160) not null,
  body           varchar(300),
  assignment_id  uuid references public.assignments (id) on delete cascade,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
--  RELACIÓN ENTREGA → TAREA
--  Una evidencia puede haber nacido de una tarea asignada o ser espontánea.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.deliveries
  add column if not exists assignment_id uuid references public.assignments (id) on delete set null;

alter table public.deliveries
  add column if not exists created_by uuid references public.app_users (id) on delete set null;

create index if not exists deliveries_assignment_idx on public.deliveries (assignment_id);

-- ───────────────────────────────────────────────────────────────────────────
--  FOLIO DE TAREAS  ·  TA-YYYYMMDD-000001
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.assignment_folio_counters (
  day          date primary key,
  last_number  integer not null default 0
);

create or replace function public.next_assignment_folio()
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

  insert into public.assignment_folio_counters (day, last_number)
  values (v_day, 1)
  on conflict (day)
    do update set last_number = public.assignment_folio_counters.last_number + 1
  returning last_number into v_number;

  return 'TA-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  KPIs POR USUARIO
--
--  tiempo_activo = (fin - inicio) - segundos en pausa.
--  a_tiempo = se completó antes de due_at.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.user_kpis(p_days integer default 30)
returns table (
  user_id              uuid,
  user_name            varchar,
  asignadas            bigint,
  completadas          bigint,
  en_curso             bigint,
  vencidas             bigint,
  a_tiempo             bigint,
  pct_a_tiempo         numeric,
  minutos_promedio     numeric,
  minutos_pausa_prom   numeric,
  minutos_respuesta    numeric,
  entregas_totales     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with rango as (
    select now() - (p_days || ' days')::interval as desde
  ),
  base as (
    select
      a.*,
      case
        when a.completed_at is not null and a.started_at is not null
        then extract(epoch from (a.completed_at - a.started_at)) - a.paused_seconds
      end as segundos_activos,
      case
        when a.started_at is not null
        then extract(epoch from (a.started_at - a.created_at))
      end as segundos_respuesta
    from public.assignments a, rango
    where a.created_at >= rango.desde
  )
  select
    u.id,
    u.name,
    count(b.id),
    count(b.id) filter (where b.status = 'completada'),
    count(b.id) filter (where b.status in ('en_progreso', 'pausada')),
    count(b.id) filter (
      where b.due_at is not null
        and b.status <> 'completada'
        and b.due_at < now()
    ),
    count(b.id) filter (
      where b.status = 'completada' and b.due_at is not null and b.completed_at <= b.due_at
    ),
    round(
      100.0 * count(b.id) filter (
        where b.status = 'completada' and b.due_at is not null and b.completed_at <= b.due_at
      ) / nullif(count(b.id) filter (where b.status = 'completada'), 0),
      1
    ),
    round((avg(b.segundos_activos) / 60.0)::numeric, 1),
    round((avg(b.paused_seconds) filter (where b.status = 'completada') / 60.0)::numeric, 1),
    round((avg(b.segundos_respuesta) / 60.0)::numeric, 1),
    (
      select count(*)
      from public.deliveries d, rango
      where d.created_by = u.id and d.created_at >= rango.desde
    )
  from public.app_users u
  left join base b on b.assigned_to = u.id
  where u.active
  group by u.id, u.name
  order by u.name;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  SEGURIDAD · RLS activo sin policies (solo la service role entra)
-- ───────────────────────────────────────────────────────────────────────────
alter table public.app_users                enable row level security;
alter table public.assignments              enable row level security;
alter table public.assignment_events        enable row level security;
alter table public.notifications            enable row level security;
alter table public.assignment_folio_counters enable row level security;

revoke all on function public.next_assignment_folio() from anon, authenticated;
revoke all on function public.user_kpis(integer)      from anon, authenticated;
