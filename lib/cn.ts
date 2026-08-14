/** Une clases condicionales sin dependencias extra. */
export function cn(...values: unknown[]): string {
  return values.filter((value) => typeof value === 'string' && value).join(' ');
}
