-- ═══════════════════════════════════════════════════════════════════════════
--  Datos iniciales · empleados de ejemplo
--  Ejecutar después de schema.sql. Puedes editar o quitar estos nombres.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.employees (name, active)
select v.name, true
from (values
  ('Juan Pérez'),
  ('Carlos Martínez'),
  ('Luis Hernández'),
  ('María Gómez')
) as v(name)
where not exists (
  select 1 from public.employees e where e.name = v.name
);
