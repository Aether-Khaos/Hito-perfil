/**
 * Lector del libro «Calificaciones por materia» (consolidado institucional):
 * una fila por estudiante y una columna por asignatura, con columnas de
 * «Resultados …» (nivel en texto), «Habilidades blandas» y «Promedio».
 *
 * Se usa para la validación cruzada con el libro por pregunta y para incorporar
 * Habilidades blandas, que no tiene examen por preguntas.
 */
import { buscarMateria } from './catalogo-reactivos';
import { aNumero, type FilaCruda } from './parser-libro';
import { normalizarTexto } from './texto';

export interface FilaConsolidadoLeida {
  nombre: string;
  correo: string;
  valores: Record<string, number | null>;
}

const HABILIDADES = 'Habilidades blandas';

/** Devuelve las filas si la hoja tiene formato de consolidado; `null` si no lo tiene. */
export function leerConsolidado(filas: FilaCruda[]): FilaConsolidadoLeida[] | null {
  if (!Array.isArray(filas) || filas.length < 2) return null;
  const limite = Math.min(filas.length, 5);
  for (let f = 0; f < limite; f++) {
    const encabezado = filas[f] ?? [];
    let iNombre = -1;
    let iCorreo = -1;
    const columnas: Array<{ indice: number; nombre: string }> = [];
    encabezado.forEach((celda, i) => {
      const texto = normalizarTexto(String(celda ?? ''));
      if (!texto) return;
      if (iNombre === -1 && (texto.includes('nombre') || texto === 'estudiante')) return void (iNombre = i);
      if (iCorreo === -1 && (texto.includes('correo') || texto.includes('email'))) return void (iCorreo = i);
      if (texto.startsWith('resultado') || texto.startsWith('promedio') || texto.startsWith('competencia')) return;
      if (texto.includes('habilidades blandas')) return void columnas.push({ indice: i, nombre: HABILIDADES });
      const materia = buscarMateria(String(celda));
      if (materia) columnas.push({ indice: i, nombre: materia.nombre });
    });
    const materias = columnas.filter((c) => c.nombre !== HABILIDADES).length;
    if (iNombre === -1 || materias < 3) continue;

    const salida: FilaConsolidadoLeida[] = [];
    for (let r = f + 1; r < filas.length; r++) {
      const fila = filas[r] ?? [];
      // Algunas filas traen un prefijo de numeración («3. CHURA ZEGARRA …»).
      const nombre = String(fila[iNombre] ?? '').trim().replace(/^\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ');
      if (!nombre || /^(notas?|puntajes?|promedio|total)$/i.test(normalizarTexto(nombre))) continue;
      const valores: Record<string, number | null> = {};
      for (const c of columnas) valores[c.nombre] = aNumero(fila[c.indice]);
      if (Object.values(valores).every((v) => v === null)) continue;
      salida.push({ nombre, correo: iCorreo >= 0 ? String(fila[iCorreo] ?? '').trim() : '', valores });
    }
    return salida;
  }
  return null;
}

/** Une varias hojas de consolidado: por estudiante, el valor no nulo más reciente gana. */
export function unirConsolidados(hojas: FilaConsolidadoLeida[][]): FilaConsolidadoLeida[] {
  const mapa = new Map<string, FilaConsolidadoLeida>();
  for (const hoja of hojas) {
    for (const fila of hoja) {
      const clave = normalizarTexto(fila.nombre);
      const actual = mapa.get(clave) ?? { nombre: fila.nombre, correo: fila.correo, valores: {} };
      for (const [k, v] of Object.entries(fila.valores)) if (v !== null || !(k in actual.valores)) actual.valores[k] = v;
      if (!actual.correo) actual.correo = fila.correo;
      mapa.set(clave, actual);
    }
  }
  return Array.from(mapa.values());
}
