/**
 * Formato de fechas. La fuente de verdad siempre es `created_at` del servidor;
 * aquí solo se traduce a la zona horaria de operación.
 */

export const TIME_ZONE = 'America/Chihuahua';

const longDate = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDate = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const numericDate = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const time = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function clean(value: string): string {
  // Intl en es-MX agrega puntos en meses abreviados ("14 ago. 2026").
  return value.replace(/\./g, '');
}

/** `14 de agosto de 2026` */
export function formatLongDate(value: string | Date): string {
  return longDate.format(toDate(value));
}

/** `14 Ago 2026` */
export function formatShortDate(value: string | Date): string {
  const parts = clean(shortDate.format(toDate(value))).split(' ');
  if (parts.length < 3) return clean(shortDate.format(toDate(value)));
  const [day, month, year] = parts;
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

/** `14/08/2026` */
export function formatNumericDate(value: string | Date): string {
  return numericDate.format(toDate(value));
}

/** `10:35 AM` */
export function formatTime(value: string | Date): string {
  return time.format(toDate(value)).replace(/\s?([ap])\.?\s?m\.?/i, (_m, p) =>
    ` ${String(p).toUpperCase()}M`,
  );
}

/** `14 Ago 2026 · 10:35 AM` */
export function formatDateTime(value: string | Date): string {
  return `${formatShortDate(value)} · ${formatTime(value)}`;
}

/** `Hoy · 10:24 AM`, `Ayer · 4:10 PM` o `12 Ago · 9:00 AM` */
export function formatRelativeDateTime(value: string | Date): string {
  const date = toDate(value);
  const now = new Date();
  const key = dayKey.format(date);
  const todayKey = dayKey.format(now);
  const yesterdayKey = dayKey.format(new Date(now.getTime() - 86_400_000));

  if (key === todayKey) return `Hoy · ${formatTime(date)}`;
  if (key === yesterdayKey) return `Ayer · ${formatTime(date)}`;
  return formatDateTime(date);
}

/** Fecha local (America/Chihuahua) en formato `YYYY-MM-DD`. */
export function localDayKey(value: string | Date = new Date()): string {
  return dayKey.format(toDate(value));
}
