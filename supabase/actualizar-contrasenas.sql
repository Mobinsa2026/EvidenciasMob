-- ═══════════════════════════════════════════════════════════════════════════
--  Rotar contraseñas de usuarios existentes
--
--  El seed-usuarios.sql solo inserta usuarios que no existan, así que si la
--  base ya fue sembrada NO actualiza contraseñas. Ejecuta este script para
--  aplicar las contraseñas de arranque nuevas a los usuarios que ya existen.
--
--  Idempotente: puedes ejecutarlo las veces que quieras; el resultado final
--  siempre es el mismo.
-- ═══════════════════════════════════════════════════════════════════════════

update public.app_users
set password_hash = 'scrypt$a4f96b9681e6089862daadd61cb679d4$ccf4334fa46625522fe5b421c9f48ddeacb8661c7b235238df2740cde789a9d1568ba3017c8157888623bc26af93ee0b430e556f17caf79d174f24899f54c817'
where username = 'rosendo';

update public.app_users
set password_hash = 'scrypt$4bc75332e8381e557d0bb3abc25730da$833fda55aa946116c1d8aec630f19be5ce899453d8ac49def381f81042110242de75397535f7adefb18497c580f1fe90292a067b44102f86bdc0ecbc347d95fb'
where username = 'diego';

update public.app_users
set password_hash = 'scrypt$1018ee8c8b4cc8f0dd6d1cf66bfa7ed8$7049a0f8e110c313ca88aed3ad93e2cc33a1b30a304dcab4a6bde10cc22cb5cc0d161272977a82d9c607ca31455702ffb1e6ba0f6d51b34596fb3de2add63e21'
where username = 'paola';