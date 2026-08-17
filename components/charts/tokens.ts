/**
 * Colores de las gráficas.
 *
 * El morado corporativo (#37277E) queda demasiado oscuro como relleno sobre
 * blanco: cae fuera de la banda de luminosidad recomendada. Este es el mismo
 * morado un paso más claro, validado para daltonismo (protanopia, deuteranopia
 * y tritanopia) y contra el fondo de la tarjeta.
 */
export const CHART_HUE = '#5D4DBF';

/** Carril de fondo de los medidores: un paso sobre la superficie. */
export const CHART_TRACK = '#ECEAF7';

/**
 * Colores de estado. Se usan solo cuando el color significa bueno o malo, y
 * siempre acompañados de texto — nunca el color solo.
 */
export const ESTADO_COLOR = {
  bueno: '#22A06B',
  regular: '#F59E0B',
  malo: '#E21915',
} as const;

export type Tono = keyof typeof ESTADO_COLOR;

/** Umbrales de puntualidad usados en toda la vista de desempeño. */
export function tonoPuntualidad(pct: number | null): Tono {
  if (pct === null) return 'regular';
  if (pct >= 90) return 'bueno';
  if (pct >= 70) return 'regular';
  return 'malo';
}
