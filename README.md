# Evidencias · Control de Entregas

Aplicación web **mobile first** para registrar evidencias de entrega de Órdenes de Trabajo
y Facturas: fotografías, firma, folio único, fecha/hora del servidor y ubicación opcional.

Next.js 15 · React · TypeScript · TailwindCSS v4 · Supabase (PostgreSQL + Storage) ·
Lucide React. Preparada para desplegar en Railway.

---

## 1 · Configurar Supabase

### 1.1 Crear el esquema

Panel de Supabase → **SQL Editor** → **New query** → pega y ejecuta:

1. [`supabase/schema.sql`](supabase/schema.sql) — tablas, índices, funciones y RLS.
2. [`supabase/seed.sql`](supabase/seed.sql) — cuatro empleados de ejemplo (opcional).

El script es idempotente: puedes volver a ejecutarlo sin romper nada.

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
DELETE_PASSWORD="tu-contrasena"
```

`SUPABASE_URL` es solo el dominio del proyecto (**sin** `/rest/v1/`): la
librería agrega la ruta sola.

`DELETE_PASSWORD` es la contraseña que se pide al eliminar una evidencia. Si la
dejas vacía, el botón de eliminar simplemente no aparece. Ponla **entre
comillas** si empieza con `#` o contiene espacios; si no, `dotenv` leería el `#`
como el inicio de un comentario y la variable quedaría vacía.

> ⚠️ La `SUPABASE_SERVICE_ROLE_KEY` **solo vive en el servidor**. `lib/supabase-admin.ts`
> importa `server-only`, de modo que el build falla si algún componente de cliente
> intentara importarla. Nunca subas `.env.local` a GitHub.

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
4. **Variables** del servicio — agrega las cinco:

   | Variable                    | Valor                          |
   | --------------------------- | ------------------------------ |
   | `SUPABASE_URL`              | URL del proyecto Supabase      |
   | `SUPABASE_ANON_KEY`         | anon key                       |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key               |
   | `NEXT_PUBLIC_APP_NAME`      | `Evidencias`                   |
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
  page.tsx                    Inicio · estadísticas + entregas recientes
  registrar/page.tsx          Formulario de nueva evidencia
  historial/page.tsx          Historial con buscador y filtros
  evidencias/[id]/page.tsx    Detalle · comprobante digital
  empleados/page.tsx          Alta / activación de empleados
  api/deliveries/            POST (multipart) · GET (búsqueda y filtros)
  api/deliveries/[id]/       GET (acepta UUID o folio) · DELETE (con contraseña)
  api/employees/             GET · POST
  api/employees/[id]/        PATCH (activo / inactivo)

components/                   Header, BottomNavigation, DeliveryForm,
                              DocumentSelector, StatusSelector, EmployeeSelector,
                              PhotoUploader, PhotoPreview, SignaturePad,
                              LocationCapture, DeliveryCard, DeliveryTable,
                              DeliveryFilters, SearchBar, StatsCard,
                              SuccessScreen, EvidenceGallery, ui/*

lib/                          supabase-admin, queries, storage, validation,
                              image (compresión), rate-limit, format, types

supabase/                     schema.sql · seed.sql
```

---

## 5 · Cómo funciona el registro

El formulario envía **un solo POST** `multipart/form-data` a `/api/deliveries`.
El backend, en orden:

1. Aplica rate limiting por IP (15 registros por hora).
2. Valida y sanitiza los textos con Zod.
3. Comprueba las fotografías (1 a 5, imagen, ≤ 3 MB ya comprimidas).
4. Comprueba la firma.
5. Descarta duplicados por `idempotency_key` (doble tap o reintento de red
   devuelven el mismo folio, no crean otra evidencia).
6. Genera el folio con la función atómica `next_folio()` de PostgreSQL.
7. Sube la firma y las fotografías a Storage.
8. Inserta en `deliveries` y `delivery_photos` (`created_at` lo pone el servidor).
9. Devuelve folio, id y fecha. Si algo falla, borra los archivos ya subidos.

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

## 7 · Seguridad sin login

- RLS activado en las cuatro tablas **sin policies**: las claves públicas no pueden
  leer ni escribir nada. Todo pasa por el backend con la service role.
- Buckets privados; el navegador solo recibe URLs firmadas temporales.
- Rate limiting por IP (escrituras y lecturas).
- Sanitización de textos y límites de longitud en servidor.
- Protección contra envíos duplicados por clave de idempotencia.
- **Cloudflare Turnstile preparado, apagado por defecto**: define
  `TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` para activar la
  verificación sin tocar código (`lib/rate-limit.ts`).

---

## 8 · Base de datos

| Tabla             | Descripción                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `employees`       | Personal de entregas. Nunca se elimina: se marca `active = false`.  |
| `deliveries`      | Evidencias. PK UUID + `folio` único visible.                        |
| `delivery_photos` | Fotografías, `ON DELETE CASCADE` sobre `deliveries`.                |
| `folio_counters`  | Contador diario que respalda el folio consecutivo.                  |

Formato de folio: `EV-YYYYMMDD-000001` (por ejemplo `EV-20260814-000123`).

---

## 9 · Pendiente para una siguiente versión

- **Descargar comprobante en PDF.** El botón ya existe en el detalle, deshabilitado.
  Todo lo que necesita el PDF (folio, datos, URLs firmadas de fotos y firma,
  fecha y ubicación) lo devuelve `getDelivery()` en `lib/queries.ts`.
