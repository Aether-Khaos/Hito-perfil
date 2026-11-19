/**
 * Lector de archivos .xlsx sin dependencias externas.
 *
 * Un .xlsx es un ZIP con XML dentro. Este módulo abre el paquete con `zlib`,
 * interpreta las cadenas compartidas y las hojas, y devuelve exactamente la
 * misma estructura que entrega Google Sheets (`values.get`), de modo que el
 * resto del sistema no distingue el origen del dato.
 *
 * Ventaja práctica: permite analizar el libro sin credenciales ni API de Google.
 */

import { inflateRawSync } from 'node:zlib';

export interface HojaXlsx {
  titulo: string;
  filas: string[][];
}

interface EntradaZip {
  nombre: string;
  metodo: number;
  inicioDatos: number;
  comprimido: number;
}

const FIRMA_EOCD = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_LOCAL = 0x04034b50;

function leerEntradas(buffer: Buffer): Map<string, EntradaZip> {
  const entradas = new Map<string, EntradaZip>();

  // 1. Localizar el "End of Central Directory" (últimos 64 KB).
  let eocd = -1;
  const inicio = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= inicio; i--) {
    if (buffer.readUInt32LE(i) === FIRMA_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('El archivo no parece un .xlsx válido (no se encontró el índice ZIP).');

  const totalEntradas = buffer.readUInt16LE(eocd + 10);
  let puntero = buffer.readUInt32LE(eocd + 16);

  // 2. Recorrer el directorio central.
  for (let i = 0; i < totalEntradas; i++) {
    if (puntero + 46 > buffer.length || buffer.readUInt32LE(puntero) !== FIRMA_CENTRAL) break;

    const metodo = buffer.readUInt16LE(puntero + 10);
    const comprimido = buffer.readUInt32LE(puntero + 20);
    const largoNombre = buffer.readUInt16LE(puntero + 28);
    const largoExtra = buffer.readUInt16LE(puntero + 30);
    const largoComentario = buffer.readUInt16LE(puntero + 32);
    const offsetLocal = buffer.readUInt32LE(puntero + 42);
    const nombre = buffer.toString('utf8', puntero + 46, puntero + 46 + largoNombre);

    if (offsetLocal + 30 <= buffer.length && buffer.readUInt32LE(offsetLocal) === FIRMA_LOCAL) {
      const nombreLocal = buffer.readUInt16LE(offsetLocal + 26);
      const extraLocal = buffer.readUInt16LE(offsetLocal + 28);
      entradas.set(nombre, {
        nombre,
        metodo,
        inicioDatos: offsetLocal + 30 + nombreLocal + extraLocal,
        comprimido,
      });
    }

    puntero += 46 + largoNombre + largoExtra + largoComentario;
  }

  return entradas;
}

function extraer(buffer: Buffer, entrada: EntradaZip): Buffer {
  const datos = buffer.subarray(entrada.inicioDatos, entrada.inicioDatos + entrada.comprimido);
  if (entrada.metodo === 0) return datos;
  if (entrada.metodo === 8) return inflateRawSync(datos);
  throw new Error(`Método de compresión no soportado (${entrada.metodo}) en ${entrada.nombre}.`);
}

function textoDe(buffer: Buffer, entradas: Map<string, EntradaZip>, ruta: string): string | null {
  const entrada = entradas.get(ruta);
  if (!entrada) return null;
  return extraer(buffer, entrada).toString('utf8');
}

/** Desescapa las entidades XML habituales. */
function desescapar(texto: string): string {
  return texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codigo) => String.fromCharCode(Number(codigo)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, codigo) => String.fromCharCode(parseInt(codigo, 16)))
    .replace(/&amp;/g, '&');
}

function leerCadenasCompartidas(xml: string | null): string[] {
  if (!xml) return [];
  const cadenas: string[] = [];
  const bloques = xml.match(/<si\b[\s\S]*?<\/si>/g) || [];
  for (const bloque of bloques) {
    const partes = bloque.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || [];
    const texto = partes
      .map((parte) => desescapar(parte.replace(/<[^>]+>/g, '')))
      .join('');
    cadenas.push(texto);
  }
  return cadenas;
}

/** Convierte "A1" o "AB12" en el índice de columna (base 0). */
function indiceColumna(referencia: string): number {
  const letras = referencia.replace(/\d+/g, '').toUpperCase();
  let indice = 0;
  for (const letra of letras) {
    indice = indice * 26 + (letra.charCodeAt(0) - 64);
  }
  return Math.max(indice - 1, 0);
}

function valorCelda(celda: string, cadenas: string[]): string {
  const tipo = (celda.match(/\bt="([^"]+)"/) || [])[1] || 'n';
  const enLinea = celda.match(/<is\b[\s\S]*?<\/is>/);
  if (tipo === 'inlineStr' && enLinea) {
    const textos = enLinea[0].match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || [];
    return desescapar(textos.map((t) => t.replace(/<[^>]+>/g, '')).join(''));
  }
  const valor = celda.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  if (!valor) return '';
  const crudo = desescapar(valor[1]);
  if (tipo === 's') {
    const posicion = Number(crudo);
    return Number.isInteger(posicion) && cadenas[posicion] !== undefined ? cadenas[posicion] : '';
  }
  if (tipo === 'b') return crudo === '1' ? 'VERDADERO' : 'FALSO';
  return crudo;
}

function leerHojaXml(xml: string, cadenas: string[]): string[][] {
  const filas: string[][] = [];
  const filaXml = xml.match(/<row\b[\s\S]*?<\/row>/g) || [];

  for (const bloque of filaXml) {
    // Las celdas vacías se escriben autocerradas (`<c r="A1" s="1"/>`). Hay que
    // probar esa forma primero: si no, la expresión toma la celda vacía junto con
    // la siguiente y desplaza toda la fila una columna.
    const celdas = bloque.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) || [];
    const fila: string[] = [];
    for (const celda of celdas) {
      const referencia = (celda.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const indice = referencia ? indiceColumna(referencia) : fila.length;
      while (fila.length < indice) fila.push('');
      fila[indice] = valorCelda(celda, cadenas);
    }
    if (fila.some((valor) => String(valor).trim() !== '')) filas.push(fila);
  }

  return filas;
}

/**
 * Lee un libro .xlsx y devuelve sus hojas en el orden del libro.
 *
 * @param datos contenido binario del archivo
 */
export function leerLibroXlsx(datos: Buffer | ArrayBuffer | Uint8Array): HojaXlsx[] {
  const buffer = Buffer.isBuffer(datos)
    ? datos
    : datos instanceof ArrayBuffer
      ? Buffer.from(datos)
      : Buffer.from(datos);

  const entradas = leerEntradas(buffer);
  const cadenas = leerCadenasCompartidas(textoDe(buffer, entradas, 'xl/sharedStrings.xml'));

  const libro = textoDe(buffer, entradas, 'xl/workbook.xml');
  const relaciones = textoDe(buffer, entradas, 'xl/_rels/workbook.xml.rels') || '';

  const mapaRelaciones = new Map<string, string>();
  for (const relacion of relaciones.match(/<Relationship\b[^>]*>/g) || []) {
    const id = (relacion.match(/\bId="([^"]+)"/) || [])[1];
    const destino = (relacion.match(/\bTarget="([^"]+)"/) || [])[1];
    if (id && destino) {
      mapaRelaciones.set(id, destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`);
    }
  }

  const hojas: HojaXlsx[] = [];
  for (const etiqueta of (libro || '').match(/<sheet\b[^>]*>/g) || []) {
    const nombre = (etiqueta.match(/\bname="([^"]*)"/) || [])[1] || '';
    const idRelacion = (etiqueta.match(/\br:id="([^"]+)"/) || [])[1] || '';
    const ruta = mapaRelaciones.get(idRelacion);
    if (!ruta) continue;
    const xml = textoDe(buffer, entradas, ruta);
    if (!xml) continue;
    hojas.push({ titulo: desescapar(nombre), filas: leerHojaXml(xml, cadenas) });
  }

  if (hojas.length === 0) {
    throw new Error('El libro no contiene hojas legibles.');
  }

  return hojas;
}
