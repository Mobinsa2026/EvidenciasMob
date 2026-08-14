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
  position: number;
  /** URL firmada temporal, generada por el backend. */
  url: string;
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

export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 1;
export const MAX_NOTES = 500;
/** Tamaño máximo aceptado por el backend, ya comprimido en el cliente. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_SIGNATURE_BYTES = 1 * 1024 * 1024;
