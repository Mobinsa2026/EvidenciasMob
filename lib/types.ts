export type DocumentType = 'orden_trabajo' | 'factura';
export type DeliveryStatus = 'completa' | 'parcial' | 'no_entregada';

export interface Employee {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface DeliveryPhoto {
  id: string;
  photo_url: string;
  /** Ruta de la miniatura de 320 px. `null` en evidencias antiguas. */
  thumb_url: string | null;
  position: number;
  /** URL firmada temporal, generada por el backend. */
  url: string;
  /** URL firmada de la miniatura; cae a `url` si no hay miniatura. */
  thumb: string;
}

export interface Delivery {
  id: string;
  folio: string;
  document_type: DocumentType;
  document_number: string;
  client_name: string;
  received_by: string | null;
  delivered_by: string;
  delivery_status: DeliveryStatus;
  title: string;
  notes: string | null;
  signature_url: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  created_at: string;
  /**
   * Cuándo se liberó el espacio de sus imágenes tras descargar el respaldo.
   * El registro permanece; solo los archivos dejaron de estar en Storage.
   */
  photos_archived_at: string | null;
}

/** Evidencia lista para pintar en la UI. */
export interface DeliveryView extends Delivery {
  employee_name: string;
  photo_count: number;
  photos: DeliveryPhoto[];
  /** URL firmada temporal de la firma. */
  signature: string | null;
}

/** Versión ligera para listados (sin fotos resueltas). */
export interface DeliveryListItem {
  id: string;
  folio: string;
  document_type: DocumentType;
  document_number: string;
  client_name: string;
  received_by: string | null;
  delivery_status: DeliveryStatus;
  title: string;
  employee_name: string;
  photo_count: number;
  created_at: string;
}

export interface DeliveryStats {
  today: number;
  this_week: number;
  total: number;
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  orden_trabajo: 'Orden de Trabajo',
  factura: 'Factura',
};

export const DOCUMENT_TYPE_SHORT: Record<DocumentType, string> = {
  orden_trabajo: 'OT',
  factura: 'Factura',
};

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  completa: 'Entrega completa',
  parcial: 'Entrega parcial',
  no_entregada: 'No se pudo entregar',
};

// ─── Usuarios y roles ───────────────────────────────────────────────────────

export type Role = 'jefe' | 'asistente';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  employee_id: string | null;
}

export interface AppUser extends SessionUser {
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ─── Tareas asignadas ───────────────────────────────────────────────────────

export type AssignmentStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'pausada'
  | 'completada'
  | 'cancelada';

export type AssignmentEventType =
  | 'asignada'
  | 'iniciada'
  | 'pausada'
  | 'reanudada'
  | 'completada'
  | 'cancelada';

export interface Assignment {
  id: string;
  folio: string;
  document_type: DocumentType;
  document_number: string;
  client_name: string;
  title: string;
  instructions: string | null;
  address: string | null;
  assigned_to: string;
  created_by: string;
  time_limit_minutes: number;
  status: AssignmentStatus;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  paused_seconds: number;
  paused_at: string | null;
  delivery_id: string | null;
  created_at: string;
}

export interface AssignmentView extends Assignment {
  assigned_to_name: string;
  created_by_name: string;
  /** true si el plazo ya venció y la tarea sigue abierta. */
  vencida: boolean;
  /** Segundos activos consumidos (sin contar pausas). */
  segundos_activos: number;
  /** Segundos restantes del plazo; negativo si se pasó. */
  segundos_restantes: number;
}

export interface AssignmentEvent {
  id: string;
  assignment_id: string;
  user_id: string;
  user_name: string;
  type: AssignmentEventType;
  photo_url: string | null;
  /** URL firmada temporal de la fotografía. */
  photo: string | null;
  /**
   * Cuándo pasó la fotografía al respaldo. `photo_url` se conserva como
   * constancia de que existió, pero el archivo ya no está en Storage.
   */
  photo_archived_at: string | null;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  assignment_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface UserKpi {
  user_id: string;
  user_name: string;
  asignadas: number;
  completadas: number;
  en_curso: number;
  vencidas: number;
  a_tiempo: number;
  pct_a_tiempo: number | null;
  minutos_promedio: number | null;
  minutos_pausa_prom: number | null;
  minutos_respuesta: number | null;
  entregas_totales: number;
}

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  pausada: 'Pausada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const ASSIGNMENT_EVENT_LABEL: Record<AssignmentEventType, string> = {
  asignada: 'Tarea asignada',
  iniciada: 'Entrega iniciada',
  pausada: 'Entrega pausada',
  reanudada: 'Entrega reanudada',
  completada: 'Entrega completada',
  cancelada: 'Tarea cancelada',
};

/** Plazos sugeridos al asignar, en minutos. */
export const TIME_PRESETS = [30, 60, 120, 240, 480] as const;

export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 1;
export const MAX_NOTES = 500;
/** Tamaño máximo aceptado por el backend, ya comprimido en el cliente. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_SIGNATURE_BYTES = 1 * 1024 * 1024;
