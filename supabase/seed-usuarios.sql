-- ═══════════════════════════════════════════════════════════════════════════
--  Usuarios iniciales
--  Ejecutar después de migration-002-usuarios-tareas.sql
--
--  Contraseñas de arranque (cámbialas desde Ajustes → Cambiar contraseña):
--
--    rosendo  ·  Rosendo2026*   (jefe)
--    diego    ·  Entrega2026*   (asistente)
--    paola    ·  Entrega2026*   (asistente)
--
--  Los hashes son scrypt con sal aleatoria: de aquí no se puede recuperar la
--  contraseña original.
--
--  Diego y Paola son nombres provisionales; cámbialos por los reales desde
--  Ajustes → Usuarios, o con un UPDATE sobre app_users y employees.
-- ═══════════════════════════════════════════════════════════════════════════

-- Cada usuario necesita su ficha en `employees` para poder aparecer como
-- responsable de una entrega.
insert into public.employees (name, active)
select v.name, true
from (values ('Rosendo Muñoz'), ('Diego Fuentes'), ('Paola Rentería')) as v(name)
where not exists (select 1 from public.employees e where e.name = v.name);

insert into public.app_users (name, username, password_hash, role, employee_id)
select
  v.name,
  v.username,
  v.password_hash,
  v.role,
  (select e.id from public.employees e where e.name = v.name limit 1)
from (values
  (
    'Rosendo Muñoz', 'rosendo',
    'scrypt$b952dbd3a3d06ace97a07fb1ac18c131$1b94b5d1d88669fc7ac5cd2446306eda67278f9b68e8760277f1351a228be2824d17daa8db6dce71d5063c845e6d46ecfec23a79c1de4b0766595eaca4aeadea',
    'jefe'
  ),
  (
    'Diego Fuentes', 'diego',
    'scrypt$d8cea3a319517bb147d369c75bbb87ba$143bace91ab857e4d7fcf37870300ab7e7b86e4e6bc5d33912fab03584c0a750faac3daad7a5629ce35c93143919a275141411f5b432f25a0e5411fd2b475292',
    'asistente'
  ),
  (
    'Paola Rentería', 'paola',
    'scrypt$04b1658bf72ee85597939d5387750f4d$3ba70abe6283f2808e48370c520e95864c0b28e2429a24590964ab628a7e87b60c05c9530d53295072077af0d78f78cae0991cbea44ece3646070fb666745842',
    'asistente'
  )
) as v(name, username, password_hash, role)
where not exists (
  select 1 from public.app_users u where u.username = v.username
);
