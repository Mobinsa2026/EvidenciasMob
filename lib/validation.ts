import { z } from 'zod';
import { MAX_NOTES } from './types';

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

/** Quita caracteres de control, recorta y colapsa espacios repetidos. */
export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

/** Igual que `sanitizeText` pero conserva los saltos de línea (textarea). */
export function sanitizeMultiline(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const text = (max: number) =>
  z.preprocess(sanitizeText, z.string().max(max, `Máximo ${max} caracteres.`));

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      const clean = sanitizeText(v);
      return clean.length ? clean : undefined;
    },
    z.string().max(max, `Máximo ${max} caracteres.`).optional(),
  );

const optionalMultiline = (max: number) =>
  z.preprocess(
    (v) => {
      const clean = sanitizeMultiline(v);
      return clean.length ? clean : undefined;
    },
    z.string().max(max, `Máximo ${max} caracteres.`).optional(),
  );

const optionalNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

export const deliveryInputSchema = z.object({
  document_type: z.enum(['orden_trabajo', 'factura'], {
    errorMap: () => ({ message: 'Selecciona el tipo de documento.' }),
  }),
  document_number: text(40).pipe(
    z.string().min(2, 'Ingresa el número de la orden o factura.'),
  ),
  client_name: text(120).pipe(z.string().min(2, 'Ingresa el nombre del cliente.')),
  received_by: optionalText(120),
  delivered_by: z.string().uuid('Selecciona quién realiza la entrega.'),
  delivery_status: z.enum(['completa', 'parcial', 'no_entregada'], {
    errorMap: () => ({ message: 'Selecciona el estado de la entrega.' }),
  }),
  title: text(160).pipe(z.string().min(3, 'Ingresa un título para la evidencia.')),
  notes: optionalMultiline(MAX_NOTES),
  latitude: optionalNumber.refine(
    (v) => v === undefined || (v >= -90 && v <= 90),
    'Latitud inválida.',
  ),
  longitude: optionalNumber.refine(
    (v) => v === undefined || (v >= -180 && v <= 180),
    'Longitud inválida.',
  ),
  location_accuracy: optionalNumber.refine(
    (v) => v === undefined || (v >= 0 && v <= 100_000),
    'Precisión inválida.',
  ),
  idempotency_key: z.string().uuid().optional(),
});

export type DeliveryInput = z.infer<typeof deliveryInputSchema>;

export const employeeInputSchema = z.object({
  name: text(120).pipe(z.string().min(2, 'Ingresa el nombre del empleado.')),
});

/** Convierte un ZodError en `{ campo: mensaje }` para pintarlo bajo cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** `Entrega OT-1245 · Empresa ABC` */
export function buildTitle(
  documentType: 'orden_trabajo' | 'factura',
  documentNumber: string,
  clientName: string,
): string {
  const doc = sanitizeText(documentNumber);
  const client = sanitizeText(clientName);
  const prefix = documentType === 'orden_trabajo' ? 'Entrega' : 'Entrega factura';

  if (!doc && !client) return '';
  if (!client) return `${prefix} ${doc}`;
  if (!doc) return `${prefix} · ${client}`;
  return `${prefix} ${doc} · ${client}`.slice(0, 160);
}
