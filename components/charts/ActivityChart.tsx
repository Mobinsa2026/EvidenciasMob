import { cn } from '@/lib/cn';
import { CHART_HUE } from './tokens';

/**
 * Actividad completada en el periodo.
 *
 * Una sola serie, un solo tono: la altura ya codifica la magnitud, así que
 * pintar cada columna de distinto color sería doble codificación. Sin leyenda
 * por lo mismo — el título dice qué se grafica.
 */

interface Punto {
  etiqueta: string;
  fecha: string;
  completadas: number;
  tarde: number;
}

/** Alto del área de columnas y del carril reservado para la etiqueta del pico. */
const ALTO = 150;
const CARRIL_ETIQUETA = 18;

export function ActivityChart({
  serie,
  porSemana,
}: {
  serie: Punto[];
  porSemana: boolean;
}) {
  const maximo = Math.max(...serie.map((p) => p.completadas), 0);
  const total = serie.reduce((suma, p) => suma + p.completadas, 0);

  if (total === 0) {
    return (
      <p className="flex h-32 items-center justify-center rounded-btn bg-canvas text-sm text-muted">
        Sin entregas completadas en este periodo.
      </p>
    );
  }

  // Escala redondeada para que la referencia superior sea un número limpio.
  const tope = maximo <= 4 ? Math.max(maximo, 1) : Math.ceil(maximo / 5) * 5;
  const util = ALTO - CARRIL_ETIQUETA;

  // Con muchas columnas solo se etiquetan algunas para que no se encimen.
  const paso = serie.length > 16 ? Math.ceil(serie.length / 7) : 1;

  return (
    <figure className="m-0">
      <div className="relative" style={{ height: ALTO }}>
        {/* Referencias horizontales: hairline recesiva, nunca punteada. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-between"
          style={{ height: util }}
        >
          {[tope, Math.round(tope / 2), 0].map((valor) => (
            <div key={valor} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted">
                {valor}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-[2px] pl-8">
          {serie.map((punto) => {
            const alto = punto.completadas ? Math.max((punto.completadas / tope) * util, 3) : 0;
            const esPico = punto.completadas === maximo && maximo > 0;

            return (
              <div
                key={punto.fecha}
                title={`${punto.etiqueta}: ${punto.completadas} completada${
                  punto.completadas === 1 ? '' : 's'
                }${punto.tarde ? ` · ${punto.tarde} fuera de plazo` : ''}`}
                className="group flex h-full flex-1 flex-col items-center justify-end"
              >
                {esPico && (
                  <span className="mb-1 text-[10px] font-bold leading-none tabular-nums text-ink">
                    {punto.completadas}
                  </span>
                )}

                <div
                  className="w-full max-w-6 rounded-t-[4px] transition-opacity duration-200 group-hover:opacity-75"
                  style={{ height: alto, backgroundColor: CHART_HUE }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-[2px] pl-8">
        {serie.map((punto, indice) => (
          <span
            key={punto.fecha}
            className={cn(
              'min-w-0 flex-1 truncate text-center text-[10px] text-muted',
              indice % paso !== 0 && 'invisible',
            )}
          >
            {punto.etiqueta}
          </span>
        ))}
      </div>

      <figcaption className="mt-3 text-xs leading-relaxed text-muted">
        {porSemana ? 'Cada columna es una semana.' : 'Cada columna es un día.'} Total del
        periodo: <strong className="font-semibold text-ink">{total}</strong> entrega
        {total === 1 ? '' : 's'}.
      </figcaption>
    </figure>
  );
}
