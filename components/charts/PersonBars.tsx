import { CHART_HUE, CHART_TRACK } from './tokens';

/**
 * Comparación de carga entre personas.
 *
 * Barras horizontales porque los nombres son largos, un solo tono porque es una
 * sola serie, y el valor va al final de cada barra: con tres o cuatro filas los
 * rótulos directos leen mejor que un eje.
 */
export function PersonBars({
  datos,
  etiqueta,
}: {
  datos: Array<{ id: string; name: string; valor: number }>;
  etiqueta: string;
}) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0);

  if (maximo === 0) {
    return (
      <p className="rounded-btn bg-canvas px-4 py-6 text-center text-sm text-muted">
        Nadie tiene {etiqueta} en este periodo.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {datos.map((persona) => {
        const ancho = (persona.valor / maximo) * 100;

        return (
          <li key={persona.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[13px] font-medium text-ink sm:w-32">
              {persona.name}
            </span>

            <div
              className="h-4 min-w-0 flex-1 overflow-hidden rounded-[4px]"
              style={{ backgroundColor: CHART_TRACK }}
            >
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${Math.max(ancho, persona.valor ? 2 : 0)}%`,
                  backgroundColor: CHART_HUE,
                }}
                title={`${persona.name}: ${persona.valor}`}
              />
            </div>

            <span className="w-7 shrink-0 text-right text-[13px] font-bold tabular-nums text-ink">
              {persona.valor}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
