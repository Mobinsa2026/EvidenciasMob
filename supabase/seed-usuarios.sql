-- ═══════════════════════════════════════════════════════════════════════════
--  Usuarios iniciales
--  Ejecutar después de migration-002-usuarios-tareas.sql
--
--  rosendo  · jefe
--  diego    · asistente
--  paola    · asistente
--
--  Las contraseñas de arranque NO se guardan aquí: te las entrega el
--  administrador del sistema por un canal seguro. Cámbialas en el primer
--  ingreso desde Ajustes → Cambiar contraseña.
--
--  Los hashes son scrypt con sal aleatoria: de aquí no se puede recuperar la
--  contraseña original.
--
--  Si la base ya fue sembrada y quieres rotar contraseñas, ejecuta
--  actualizar-contrasenas.sql (este seed solo inserta usuarios que no existan).
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
    'scrypt$a4f96b9681e6089862daadd61cb679d4$ccf4334fa46625522fe5b421c9f48ddeacb8661c7b235238df2740cde789a9d1568ba3017c8157888623bc26af93ee0b430e556f17caf79d174f24899f54c817',
    'jefe'
  ),
  (
    'Diego Fuentes', 'diego',
    'scrypt$4bc75332e8381e557d0bb3abc25730da$833fda55aa946116c1d8aec630f19be5ce899453d8ac49def381f81042110242de75397535f7adefb18497c580f1fe90292a067b44102f86bdc0ecbc347d95fb',
    'asistente'
  ),
  (
    'Paola Rentería', 'paola',
    'scrypt$1018ee8c8b4cc8f0dd6d1cf66bfa7ed8$7049a0f8e110c313ca88aed3ad93e2cc33a1b30a304dcab4a6bde10cc22cb5cc0d161272977a82d9c607ca31455702ffb1e6ba0f6d51b34596fb3de2add63e21',
    'asistente'
  )
) as v(name, username, password_hash, role)
where not exists (
  select 1 from public.app_users u where u.username = v.username
);