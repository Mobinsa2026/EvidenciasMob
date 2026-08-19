import 'server-only';

/**
 * Escritor de archivos ZIP sin compresión (método «store»).
 *
 * Sin compresión a propósito: las fotos ya son WebP y las firmas también, así
 * que pasarlas por deflate gastaría CPU para ganar casi nada. Y sin librerías
 * externas porque el escáner de seguridad de Railway ya bloqueó un despliegue
 * por vulnerabilidades de dependencias: menos paquetes, menos superficie.
 *
 * Emite un `ReadableStream`, de modo que un respaldo de cientos de megas nunca
 * se carga entero en memoria: cada archivo se descarga de Storage, se escribe
 * al stream y se descarta.
 *
 * Formato: PKZIP con descriptor de datos desactivado — se conoce el tamaño y
 * el CRC de cada entrada antes de escribir su cabecera, así que basta con la
 * estructura clásica (cabecera local · datos · directorio central · EOCD).
 */

// ─── CRC-32 ─────────────────────────────────────────────────────────────────
// `zlib.crc32` existe desde Node 22 y el proyecto corre en Node 20, así que la
// tabla se construye a mano. Son 256 entradas: se calcula una sola vez.

const CRC_TABLE = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    crc = CRC_TABLE[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Fecha en formato MS-DOS ────────────────────────────────────────────────
// ZIP guarda la fecha como dos enteros de 16 bits heredados de MS-DOS: los
// segundos van en pasos de dos y el año cuenta desde 1980.

function fechaDos(date: Date): { hora: number; fecha: number } {
  return {
    hora:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2)),
    fecha:
      ((Math.max(date.getFullYear() - 1980, 0)) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

export interface ZipEntry {
  /** Ruta dentro del ZIP, con `/` como separador. */
  name: string;
  /** Contenido, o una función que lo obtiene al momento de escribirlo. */
  data: Uint8Array | (() => Promise<Uint8Array | null>);
}

interface Registro {
  nombre: Uint8Array;
  crc: number;
  tamano: number;
  offset: number;
  hora: number;
  fecha: number;
}

function u16(valor: number): number[] {
  return [valor & 0xff, (valor >>> 8) & 0xff];
}

function u32(valor: number): number[] {
  return [valor & 0xff, (valor >>> 8) & 0xff, (valor >>> 16) & 0xff, (valor >>> 24) & 0xff];
}

/**
 * Arma el ZIP como un stream.
 *
 * Las entradas cuyo contenido no se pueda obtener se omiten en silencio: un
 * archivo perdido no debe tumbar el respaldo completo de un mes.
 */
export function crearZip(entradas: ZipEntry[]): ReadableStream<Uint8Array> {
  const registros: Registro[] = [];
  let offset = 0;
  let indice = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // ── Entradas ──────────────────────────────────────────────────────────
      while (indice < entradas.length) {
        const entrada = entradas[indice++];

        const datos =
          typeof entrada.data === 'function' ? await entrada.data() : entrada.data;
        if (!datos) continue;

        const nombre = new TextEncoder().encode(entrada.name);
        const { hora, fecha } = fechaDos(new Date());
        const crc = crc32(datos);

        const cabecera = new Uint8Array([
          ...u32(0x04034b50), // firma de cabecera local
          ...u16(20), // versión mínima
          ...u16(0x0800), // nombres en UTF-8
          ...u16(0), // método 0 = store
          ...u16(hora),
          ...u16(fecha),
          ...u32(crc),
          ...u32(datos.length), // comprimido
          ...u32(datos.length), // original
          ...u16(nombre.length),
          ...u16(0), // sin campo extra
        ]);

        registros.push({ nombre, crc, tamano: datos.length, offset, hora, fecha });
        offset += cabecera.length + nombre.length + datos.length;

        controller.enqueue(cabecera);
        controller.enqueue(nombre);
        controller.enqueue(datos);
        return; // un archivo por `pull`: mantiene la memoria plana
      }

      // ── Directorio central ────────────────────────────────────────────────
      const inicioDirectorio = offset;

      for (const registro of registros) {
        const central = new Uint8Array([
          ...u32(0x02014b50),
          ...u16(20), // versión que lo creó
          ...u16(20), // versión mínima
          ...u16(0x0800),
          ...u16(0),
          ...u16(registro.hora),
          ...u16(registro.fecha),
          ...u32(registro.crc),
          ...u32(registro.tamano),
          ...u32(registro.tamano),
          ...u16(registro.nombre.length),
          ...u16(0), // extra
          ...u16(0), // comentario
          ...u16(0), // número de disco
          ...u16(0), // atributos internos
          ...u32(0), // atributos externos
          ...u32(registro.offset),
        ]);

        controller.enqueue(central);
        controller.enqueue(registro.nombre);
        offset += central.length + registro.nombre.length;
      }

      controller.enqueue(
        new Uint8Array([
          ...u32(0x06054b50), // fin del directorio central
          ...u16(0),
          ...u16(0),
          ...u16(registros.length),
          ...u16(registros.length),
          ...u32(offset - inicioDirectorio),
          ...u32(inicioDirectorio),
          ...u16(0), // sin comentario
        ]),
      );

      controller.close();
    },
  });
}

/** Escapa un valor para CSV: comillas dobles y separadores seguros. */
export function csvCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Arma un CSV con BOM UTF-8 para que Excel en Windows respete los acentos:
 * sin el BOM, «Rentería» se abre como «RenterÃ­a».
 */
export function csv(filas: unknown[][]): Uint8Array {
  const texto = filas.map((fila) => fila.map(csvCampo).join(',')).join('\r\n');
  return new TextEncoder().encode(`﻿${texto}\r\n`);
}
