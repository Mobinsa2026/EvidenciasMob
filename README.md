# Evidencias · Control de Entregas

Aplicación web **mobile first** para registrar evidencias de entrega de Órdenes de Trabajo
y Facturas: fotografías, firma, folio único, fecha/hora del servidor y ubicación opcional.
Incluye **inicio de sesión con roles** (jefe / asistente), **tareas asignadas con
cronómetro**, notificaciones y un **panel de desempeño (KPI)** por persona.

Next.js 15 · React · TypeScript · TailwindCSS v4 · Supabase (PostgreSQL + Storage) ·
Lucide React. Preparada para desplegar en Railway.

---

## 1 · Configurar Supabase

### 1.1 Crear el esquema

Panel de Supabase → **SQL Editor** → **New query** → pega y ejecuta **en este orden**:

1. [`supabase/schema.sql`](supabase/schema.sql) — tablas, índices, funciones y RLS.
2. [`supabase/migration-002-usuarios-tareas.sql`](supabase/migration-002-usuarios-tareas.sql) — usuarios, tareas, bitácora, notificaciones y KPIs.
3. [`supabase/migration-003-espacio.sql`](supabase/migration-003-espacio.sql) — control de espacio, miniaturas y bitácora de respaldos.
4. [`supabase/seed.sql`](supabase/seed.sql) — cuatro empleados de ejemplo (opcional).
5. [`supabase/seed-usuarios.sql`](supabase/seed-usuarios.sql) — usuarios de arranque: rosendo (jefe), diego y paola (asistentes). Las contraseñas de arranque te las entrega el administrador del sistema (no están en el repositorio); cámbialas en el primer ingreso desde **Ajustes → Cambiar contraseña**.

Los scripts son idempotentes: puedes volver a ejecutarlos sin romper nada.

### 1.2 Crear los buckets de Storage

Panel de Supabase → **Storage** → **New bucket**. Crea dos, **ambos privados**
(deja *Public bucket* desactivado):

| Bucket                | Público | Contenido                       |
| --------------------- | ------- | ------------------------------- |
| `delivery-photos`     | No      | Fotografías de las entregas     |
| `delivery-signatures` | No      | Firmas de los empleados         |

Las rutas se generan solas:

```
delivery-photos/2026/08/EV-20260814-000123/photo-1.webp
delivery-signatures/2026/08/EV-20260814-000123/signature.webp
```

El navegador nunca accede directo al bucket: el backend genera **URLs firmadas** de 1 hora.

### 1.3 Variables de entorno

Panel de Supabase → **Project Settings → API**. Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

```env
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_NAME=Evidencias
SESSION_SECRET=genera-uno-con-openssl-rand-hex-32
DELETE_PASSWORD="tu-contrasena"
```

`SUPABASE_URL` es solo el dominio del proyecto (**sin** `/rest/v1/`): la
librería agrega la ruta sola.

`SESSION_SECRET` es **obligatoria**: firma las cookies de sesión (HMAC-SHA256)
y sin ella el login no funciona. Mínimo 16 caracteres; genera una con
`openssl rand -hex 32`. Si la cambias, todas las sesiones activas se invalidan.

`DELETE_PASSWORD` es la contraseña que se pide al eliminar una evidencia. Si la
dejas vacía, el botón de eliminar simplemente no aparece. Ponla **entre
comillas** si empieza con `#` o contiene espacios; si no, `dotenv` leería el `#`
como el inicio de un comentario y la variable quedaría vacía.

> ⚠️ La `SUPABASE_SERVICE_ROLE_KEY` y `SESSION_SECRET` **solo viven en el servidor**.
> `lib/supabase-admin.ts` importa `server-only` y `lib/auth.ts` solo se usa en
> handlers y server components, de modo que el build falla si algún componente de
> cliente intentara importarlas. Nunca subas `.env.local` a GitHub.

---

## 2 · Ejecutar en local

```bash
npm install
npm run dev          # http://localhost:3000
```

Otros comandos:

```bash
npm run build        # build de producción
npm run start        # servidor de producción (usa la variable PORT)
npm run typecheck    # TypeScript sin emitir
npm run lint         # ESLint
```

> **Windows + OneDrive:** si el build falla con *"is not a valid Win32 application"*,
> algún binario nativo se descargó corrupto. Se corrige reinstalando el paquete
> afectado, por ejemplo:
> `npm i lightningcss-win32-x64-msvc @next/swc-win32-x64-msvc --no-save`

---

## 3 · Desplegar en Railway

1. Sube el repositorio a GitHub (sin `.env.local`).
2. Railway → **New Project → Deploy from GitHub repo**.
3. Railway detecta Next.js con Nixpacks. [`railway.json`](railway.json) ya define
   `npm run build` y `npm run start`, y `package.json` fija Node 20.
4. **Variables** del servicio — agrega las seis:

   | Variable                    | Valor                          |
   | --------------------------- | ------------------------------ |
   | `SUPABASE_URL`              | URL del proyecto Supabase      |
   | `SUPABASE_ANON_KEY`         | anon key                       |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key               |
   | `NEXT_PUBLIC_APP_NAME`      | `Evidencias`                   |
   | `SESSION_SECRET`            | mínimo 16 caracteres, p. ej. `openssl rand -hex 32` |
   | `DELETE_PASSWORD`           | contraseña para eliminar       |

   En Railway el valor se captura tal cual en el campo, sin comillas.

   No definas `PORT`: Railway la inyecta y `next start` la respeta.
5. **Settings → Networking → Generate Domain** para obtener la URL pública.

> La cámara y el GPS del navegador solo funcionan sobre **HTTPS**. El dominio de
> Railway ya lo es; en local funciona `localhost`.

---

## 4 · Estructura del proyecto

```
app/
  page.tsx                    Inicio · saludo por rol, tareas abiertas, estadísticas
  login/page.tsx              Inicio de sesión
  registrar/page.tsx          Formulario de nueva evidencia (cierra tareas con ?tarea=)
  historial/page.tsx          Historial con buscador y filtros
  evidencias/[id]/page.tsx    Detalle · comprobante digital (acepta UUID o folio)
  tareas/page.tsx             Lista de tareas con filtros
  tareas/[id]/page.tsx        Detalle · cronómetro, bitácora, evidencia
  tareas/nueva/page.tsx       Asignar tarea (solo jefe)
  kpi/page.tsx                Panel de desempeño (7/30/90 días)
  cuenta/page.tsx             Perfil · cambio de contraseña
  empleados/page.tsx          Alta / edición / activación de empleados
  api/deliveries/             POST (multipart) · GET (búsqueda y filtros)
  api/deliveries/[id]/        GET (acepta UUID o folio) · DELETE (con contraseña)
  api/assignments/            GET · POST (crear tarea, solo jefe)
  api/assignments/[id]/       GET · DELETE (cancelar)
  api/assignments/[id]/eventos/  POST (iniciar / pausar / reanudar)
  api/employees/              GET · POST
  api/employees/[id]/         PATCH (editar / activar) · DELETE
  api/auth/                   login · logout · password
  api/notifications/          GET · POST (marcar leídas)

components/                   Header, BottomNavigation, SessionProvider, LoginForm,
                              NotificationBell, UserMenu, DeliveryForm,
                              DocumentSelector, StatusSelector, EmployeeSelector,
                              PhotoUploader, PhotoPreview, SignaturePad,
                              LocationCapture, DeliveryCard, DeliveryTable,
                              DeliveryFilters, SearchBar, StatsCard,
                              SuccessScreen, EvidenceGallery,
                              AssignmentCard, AssignmentFilters, AssignmentTimer,
                              AssignmentTimeline, NewAssignmentForm,
                              KpiUserCard, KpiPeriodo, charts/*, ui/*

lib/                          supabase-admin, auth, queries, storage, validation,
                              image, rate-limit, assignments, format, types

supabase/                     schema.sql · migration-002-usuarios-tareas.sql ·
                              seed.sql · seed-usuarios.sql · actualizar-contrasenas.sql
```

---

## 5 · Cómo funciona el registro

El formulario envía **un solo POST** `multipart/form-data` a `/api/deliveries`.
El backend, en orden:

1. Aplica rate limiting por IP (15 registros por hora).
2. Comprueba la sesión (inicio de sesión obligatorio).
3. Valida y sanitiza los textos con Zod.
4. Comprueba las fotografías (1 a 5, imagen, ≤ 3 MB ya comprimidas).
5. Comprueba la firma.
6. Descarta duplicados por `idempotency_key` (doble tap o reintento de red
   devuelven el mismo folio, no crean otra evidencia).
7. Genera el folio con la función atómica `next_folio()` de PostgreSQL.
8. Sube la firma y las fotografías a Storage.
9. Inserta en `deliveries` y `delivery_photos` (`created_at` lo pone el servidor).
10. Si el registro viene de una tarea (`?tarea=`), la **cierra**: contabiliza el
    tiempo sin pausas, registra el evento `completada` y notifica a los jefes.
11. Devuelve folio, id y fecha. Si algo falla, borra los archivos ya subidos.

Las fotografías se **comprimen en el navegador** antes de salir: se redimensionan a
1600 px de lado mayor y se convierten a WebP (respaldo JPEG), bajando la calidad
hasta quedar por debajo de ~1 MB. Nunca se sube la foto original.

La fecha y la hora **no se capturan a mano**: son el `created_at` del servidor,
mostrado siempre en zona horaria `America/Chihuahua`.

---

## 6 · Eliminar evidencias

En el detalle de cada evidencia hay un botón **Eliminar evidencia**. Pide la
contraseña de `DELETE_PASSWORD` antes de borrar.

- La contraseña **nunca se compara en el navegador**: se envía al backend, que
  responde solo sí o no. El frontend jamás la recibe ni la conoce.
- La comparación es en tiempo constante (`timingSafeEqual`), para no filtrarla
  por diferencias de tiempo de respuesta.
- Máximo **8 intentos por hora y por IP**; después responde 429.
- El borrado elimina el registro, las filas de fotografías (por `CASCADE`) y los
  archivos correspondientes en Storage. **No se puede deshacer.**

Para cambiar la contraseña basta con editar la variable y reiniciar el servidor
(o actualizarla en Railway y volver a desplegar).

---

## 7 · Seguridad

- **Inicio de sesión propio** (sin Supabase Auth): contraseñas con **scrypt**
  (sal aleatoria, comparación en tiempo constante) y sesiones en cookie firmada
  con **HMAC-SHA256** (`SESSION_SECRET`), `httpOnly`, válida 30 días.
  El login admite 10 intentos por hora y por IP.
- **Roles**: `jefe` y `asistente`. Las acciones de jefe (asignar tareas, alta de
  empleados, ver todo el equipo) exigen verificación de rol en el servidor.
- RLS activado en todas las tablas **sin policies**: las claves públicas no pueden
  leer ni escribir nada. Todo pasa por el backend con la service role.
- Buckets privados; el navegador solo recibe URLs firmadas temporales.
- Rate limiting por IP: login 10/h, escrituras 15/h, lecturas 90/min, borrados 8/h.
- Sanitización de textos y límites de longitud en servidor.
- Protección contra envíos duplicados por clave de idempotencia.
- **Cloudflare Turnstile preparado, apagado por defecto**: define
  `TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` para activar la
  verificación sin tocar código (`lib/rate-limit.ts`).

---

## 8 · Usuarios y roles

| Rol        | Puede hacer                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `jefe`     | Todo: registra evidencias, asigna y cancela tareas, ve el equipo completo, edita y elimina empleados, ve los KPIs de todos |
| `asistente`| Registra evidencias, inicia/consulta sus tareas asignadas, ve sus propios KPIs y la lista de empleados (sin modificar) |

- El acceso es con **usuario y contraseña** en `/login`. La sesión dura 30 días.
- La contraseña se cambia desde **Ajustes → Cambiar contraseña** (pide la actual,
  mínimo 8 caracteres).
- Los usuarios de arranque (`seed-usuarios.sql`) son `rosendo` (jefe) y
  `diego` / `paola` (asistentes). Sus contraseñas de arranque **no están en el
  repositorio**: te las entrega el administrador. Cámbialas en el primer ingreso.
- Si ya tienes la base sembrada y quieres rotar contraseñas, ejecuta
  [`supabase/actualizar-contrasenas.sql`](supabase/actualizar-contrasenas.sql)
  (el seed solo inserta usuarios que no existan).

---

## 9 · Tareas y cronómetro

El jefe asigna tareas desde **Tareas → Nueva** (`/tareas/nueva`):

- Folio propio **`TA-YYYYMMDD-######`** (función atómica `next_assignment_folio()`).
- Tipo de documento, responsable (usuario activo) y **plazo** de 5 a 2880 minutos
  (presets o cantidad libre).
- Al crear se notifica al asignado y queda **pendiente**.

El asistente abre la tarea y usa el **cronómetro**:

- **Iniciar**: arranca el reloj y fija el vencimiento (`due_at`).
- **Pausar**: exige **una fotografía** — sin evidencia el reloj sigue corriendo.
  La regla está reforzada en la API y en la base de datos (constraint
  `assignment_events_foto_obligatoria`).
- **Reanudar**: suma la pausa y recorre el vencimiento.
- **Completar**: solo con la evidencia. Desde el detalle de la tarea se abre el
  formulario de registro (`/registrar?tarea=<id>`), que detiene el reloj, asocia
  la evidencia a la tarea y notifica a los jefes.
- El jefe puede **cancelar** una tarea no completada (con motivo); queda en la
  bitácora y se notifica al asignado.

Cada transición (asignada, iniciada, pausada, reanudada, completada, cancelada)
queda en la **bitácora** con hora, autor y fotografía cuando aplica. Los jefes
reciben **notificaciones** (campana, con contador de no leídas).

---

## 10 · Panel de desempeño (KPI)

`/kpi` muestra, por persona y por periodo (7 / 30 / 90 días):

- Tareas **completadas**, **en curso** y **vencidas**.
- **Puntualidad**: % de tareas completadas antes del vencimiento, con medidor.
- **Tiempo promedio** de tarea (sin contar pausas) y **tiempo de respuesta**.
- **Pausas** totales, **entregas** del periodo y actividad por día.
- Comparación de carga por persona (barras) y tabla-resumen para el jefe.

El asistente solo ve su propia fila; el jefe ve a todo el equipo.

---

## 11 · Base de datos

| Tabla                      | Descripción                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `employees`                | Personal de entregas. Nunca se elimina: se marca `active = false`.  |
| `app_users`                | Usuarios con acceso (login, rol). Ligados a `employees`.            |
| `deliveries`               | Evidencias. PK UUID + `folio` único visible.                        |
| `delivery_photos`          | Fotografías, `ON DELETE CASCADE` sobre `deliveries`.                |
| `folio_counters`           | Contador diario que respalda el folio consecutivo de entregas.      |
| `assignments`              | Tareas con folio `TA-...`, plazo, estados y cronómetro.             |
| `assignment_events`        | Bitácora; `pausada` y `completada` exigen fotografía (constraint).  |
| `assignment_folio_counters`| Contador diario de folios de tareas.                                |
| `notifications`            | Avisos por usuario con `read_at`.                                   |
| `backup_log`               | Un renglón por periodo respaldado. Habilita liberar su espacio.     |

Formato de folio de entrega: `EV-YYYYMMDD-000001` (por ejemplo `EV-20260814-000123`).

---

## 12 · Almacenamiento y respaldos

El plan gratuito de Supabase da **1 GB de archivos**, no hace respaldos automáticos y
pausa el proyecto tras 7 días sin peticiones. La app se defiende de las tres cosas.

**Cuánto cabe.** Cada fotografía se reduce a 1280 px (~150 KB) y se guarda además una
miniatura de 320 px que es la que usa la galería. Con firma incluida, una entrega pesa
alrededor de **0.5 MB**: unas 2,000 entregas en el GB gratuito.

**Aviso anticipado.** El jefe ve en **Mi cuenta → Almacenamiento** cuánto se usa, cuántos
días faltan al ritmo de los últimos 30 y cuántas entregas más caben. A partir del 70%
aparece un aviso en toda la app, y en rojo desde el 90%.

**Respaldo mensual.** Desde esa misma pantalla, **Respaldo** descarga un ZIP con las
fotografías, las firmas y un CSV de todas las entregas del mes (se abre en Excel con
acentos correctos). Guárdalo fuera de Supabase — es la única copia.

**Liberar espacio.** Solo aparece para los meses cuyo respaldo ya se descargó, y pide la
contraseña de administración. Borra las imágenes de Supabase pero **conserva la entrega**:
folio, cliente, fecha y responsable siguen en el historial y en los KPIs, marcados como
archivados. De paso limpia las fotos de pausa de tareas ya cerradas.

**Que no se pause.** `GET /api/salud` es público y toca la base. El workflow
[`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) lo llama a diario;
para activarlo hay que crear la variable `APP_URL` en GitHub → *Settings → Secrets and
variables → Actions → Variables* con la URL de Railway.

---

## 13 · Pendiente para una siguiente versión

- **Descargar comprobante en PDF.** El botón ya existe en el detalle, deshabilitado.
  Todo lo que necesita el PDF (folio, datos, URLs firmadas de fotos y firma,
  fecha y ubicación) lo devuelve `getDelivery()` en `lib/queries.ts`.
- **Tests automatizados** (auth, validación, tareas y rate limiting).
- **Rate limiting en Redis** si se escala a más de una instancia (hoy es en memoria).
