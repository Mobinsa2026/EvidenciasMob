/** Utilidades de tiempo compartidas entre las vistas de tareas. */

/** `1 h 25 min`, `45 min`, `30 s` */
export function duracionCorta(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));

  if (total < 60) return `${total} s`;

  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/** `01:59:32` — para el cronómetro grande. */
export function cronometro(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;

  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(resto)}`;
}

/** `2 h`, `45 min`, `1 h 30 min` — para mostrar un plazo. */
export function plazoLegible(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}
