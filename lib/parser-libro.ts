/**
 * Lector de libros de calificaciones.
 *
 * Lee las filas crudas que devuelve Google Sheets (`values.get`) y las convierte
 * en registros normalizados:
 *
 *   1. Detecta el encabezado (nombre, correo y columnas de evaluación).
 *   2. Detecta la fila de máximos («notas», «puntaje» o «puntos») que los docentes
 *      escriben bajo el encabezado.
 *   3. Distingue una celda vacía de un cero.
 *   4. Calcula el promedio ponderado por máximos.
 *
 * Todo es puro: no lee de red ni de base de datos, por lo que se puede probar.
 */

import { porcentaje, promedioPonderado } from './escala';
import { buscarMateria, maximosDe, type MateriaCatalogo } from './catalogo-reactivos';
import { claveMateria, normalizarTexto } from './texto';

export type FilaCruda = unknown[];

export interface ColumnaReactivo {
  id: string;
  dimension: string;
}

export interface Encabezado {
  indiceNombre: number;
  indiceCorreo: number;
  /** Dimensión (P1, P2, P3, GLOBAL) → índice de columna. */
  dimensiones: Record<string, number>;
  /** Reactivo del catálogo → índice de columna. */
  reactivos: Record<string, number>;
}

export interface RegistroLeido {
  nombre: string;
  correo: string;
  puntos: Record<string, number | null>;
  reactivos: Record<string, number | null>;
  /** Porcentaje ponderado sobre los máximos disponibles. */
  promedio: number;
  completo: boolean;
  evaluacionesAusentes: string[];
}

export interface HojaLeida {
  materia: string;
  clave: string;
  catalogada: boolean;
  maxima: Record<string, number>;
  filaMaximos: number | null;
  registros: RegistroLeido[];
  /** Estudiantes que figuran en la hoja pero no tienen ninguna nota (no se presentaron). */
  sinNota: Array<{ nombre: string; correo: string }>;
  advertencias: string[];
}

export interface OpcionesLectura {
  /** Nombre con el que se guardará la asignatura (por defecto, el título de la hoja). */
  materia?: string;
  /** Catálogo a usar para resolver máximos e identificar reactivos. */
  catalogo?: MateriaCatalogo | null;
}

const FILAS_NO_ESTUDIANTE = [
  'notas',
  'nota',
  'puntaje',
  'puntajes',
  'puntos',
  'promedio',
  'promedios',
  'total',
  'totales',
  'maximo',
  'maximos',
  'estudiante',
  'nombre',
];

/** Convierte el valor de una celda en número, o `null` si está vacía. */
export function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'boolean') return null;
  const texto = String(valor).trim();
  if (texto === '') return null;
  const limpio = texto.replace(/[%\s]/g, '').replace(',', '.');
  // Descarta textos como "15 pts" o "P1: 12" conservando el primer número.
  const coincidencia = limpio.match(/-?\d+(\.\d+)?/);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[0]);
  return Number.isFinite(numero) ? numero : null;
}

function esFilaDeMaximos(fila: FilaCruda): boolean {
  const etiquetas = fila
    .slice(0, 4)
    .map((celda) => normalizarTexto(String(celda ?? '')))
    .filter((texto) => texto.length > 0);
  if (etiquetas.some((texto) => FILAS_NO_ESTUDIANTE.includes(texto))) return true;
  return false;
}

function esFilaVacia(fila: FilaCruda): boolean {
  return !fila || fila.every((celda) => celda === null || celda === undefined || String(celda).trim() === '');
}

/**
 * Interpreta el encabezado de una columna como dimensión o como reactivo.
 * Acepta `P1`, `P2`, `P3`, `P1.1`, `P1-3`, `MAT-1.1`, `Sección`, `Nota final`.
 */
export function interpretarColumna(
  encabezado: unknown,
  materia: MateriaCatalogo | null,
): { tipo: 'dimension'; id: string } | { tipo: 'reactivo'; id: string; dimension: string } | null {
  const bruto = String(encabezado ?? '').trim().toLowerCase();
  if (!bruto) return null;
  const compacto = bruto.replace(/\s+/g, '');
  const equivalencias = normalizarTexto(bruto).replace(/\s+/g, '');

  const idReactivo = compacto.match(/^(mat|pro|est|ing|log)-\d+(\.\d+)?$/);
  if (idReactivo && materia) {
    const id = compacto.toUpperCase();
    for (const dimension of materia.dimensiones) {
      if (dimension.reactivos.some((reactivo) => reactivo.id.toLowerCase() === compacto)) {
        return { tipo: 'reactivo', id, dimension: dimension.id };
      }
    }
    return null;
  }

  const dimensionSimple = compacto.match(/^p([123])$/);
  if (dimensionSimple) return { tipo: 'dimension', id: `P${dimensionSimple[1]}` };

  const dimensionConIndice = compacto.match(/^p([123])[.\-_](\d+)$/);
  if (dimensionConIndice && materia) {
    const dimensionId = `P${dimensionConIndice[1]}`;
    const indice = Number(dimensionConIndice[2]) - 1;
    const dimension = materia.dimensiones.find((d) => d.id === dimensionId);
    const reactivo = dimension?.reactivos[indice];
    if (reactivo) return { tipo: 'reactivo', id: reactivo.id, dimension: dimensionId };
    return null;
  }

  if (/^(seccion|section|global|notafinal|notaglobal|examen|puntajetotal)$/.test(equivalencias)) {
    return { tipo: 'dimension', id: 'GLOBAL' };
  }

  return null;
}

/** Localiza nombre, correo y columnas de evaluación en la primera fila. */
export function mapearEncabezado(
  fila: FilaCruda,
  materia: MateriaCatalogo | null,
): Encabezado | null {
  let indiceNombre = -1;
  let indiceCorreo = -1;
  const dimensiones: Record<string, number> = {};
  const reactivos: Record<string, number> = {};

  fila.forEach((celda, indice) => {
    const texto = normalizarTexto(String(celda ?? ''));
    if (!texto) return;
    if (indiceNombre === -1 && (texto.includes('nombre') || texto === 'estudiante' || texto.includes('alumno') || texto.includes('student'))) {
      indiceNombre = indice;
      return;
    }
    if (indiceCorreo === -1 && (texto.includes('correo') || texto.includes('email') || texto.includes('mail'))) {
      indiceCorreo = indice;
      return;
    }
    const columna = interpretarColumna(celda, materia);
    if (!columna) return;
    if (columna.tipo === 'dimension' && dimensiones[columna.id] === undefined) {
      dimensiones[columna.id] = indice;
    } else if (columna.tipo === 'reactivo' && reactivos[columna.id] === undefined) {
      reactivos[columna.id] = indice;
    }
  });

  if (indiceNombre === -1) return null;
  if (Object.keys(dimensiones).length === 0 && Object.keys(reactivos).length === 0) return null;

  return { indiceNombre, indiceCorreo, dimensiones, reactivos };
}

/** Fila de máximos: la segunda fila con etiqueta «notas»/«puntaje», o la primera fila numérica. */
export function detectarFilaMaximos(filas: FilaCruda[], encabezado: Encabezado): number | null {
  for (let i = 1; i < Math.min(filas.length, 4); i++) {
    const fila = filas[i];
    if (!fila || esFilaVacia(fila)) continue;
    if (esFilaDeMaximos(fila)) return i;
  }
  for (let i = 1; i < Math.min(filas.length, 4); i++) {
    const fila = filas[i];
    if (!fila || esFilaVacia(fila)) continue;
    // Una fila con nombre de estudiante nunca es la fila de máximos.
    const celdaNombre = fila[encabezado.indiceNombre];
    const tieneNombre = typeof celdaNombre === 'string' && normalizarTexto(celdaNombre) !== '';
    if (tieneNombre) continue;
    const numericas = Object.values({ ...encabezado.dimensiones, ...encabezado.reactivos })
      .map((indice) => aNumero(fila[indice]))
      .filter((valor): valor is number => valor !== null);
    if (numericas.length >= Math.min(2, Object.keys(encabezado.dimensiones).length)) return i;
  }
  return null;
}

function pareceNoEstudiante(nombre: string): boolean {
  const texto = normalizarTexto(nombre);
  if (!texto) return true;
  // Solo se descartan etiquetas exactas ("notas", "puntaje") o encabezados de
  // campo ("Estudiante: ..."). Un apellido que empiece con «Estudiante» es válido.
  if (FILAS_NO_ESTUDIANTE.includes(texto)) return true;
  return FILAS_NO_ESTUDIANTE.some((etiqueta) => texto.startsWith(`${etiqueta} `) && nombre.includes(':'));
}

/**
 * Lee las filas crudas de una hoja y devuelve los registros normalizados.
 *
 * @param filas filas tal como las entrega Google Sheets (la primera es el encabezado)
 */
export function leerHoja(filas: FilaCruda[], opciones: OpcionesLectura = {}): HojaLeida {
  const advertencias: string[] = [];
  const titulo = opciones.materia ?? '';
  const catalogo = opciones.catalogo ?? buscarMateria(titulo);
  const materia = opciones.materia && !catalogo ? buscarMateria(opciones.materia) : catalogo;
  const nombreMateria = materia?.nombre ?? titulo;

  if (!Array.isArray(filas) || filas.length < 2) {
    return {
      materia: nombreMateria,
      clave: claveMateria(nombreMateria),
      catalogada: !!materia,
      maxima: materia ? maximosDe(materia) : {},
      filaMaximos: null,
      registros: [],
      sinNota: [],
      advertencias: [`La hoja «${nombreMateria}» no tiene filas suficientes para analizar.`],
    };
  }

  const encabezado = mapearEncabezado(filas[0] ?? [], materia);
  if (!encabezado) {
    return {
      materia: nombreMateria,
      clave: claveMateria(nombreMateria),
      catalogada: !!materia,
      maxima: materia ? maximosDe(materia) : {},
      filaMaximos: null,
      registros: [],
      sinNota: [],
      advertencias: [
        `La hoja «${nombreMateria}» no tiene encabezados de nombre y de evaluación (P1/P2/P3 o sección). Fue omitida.`,
      ],
    };
  }

  const filaMaximos = detectarFilaMaximos(filas, encabezado);
  const maxima: Record<string, number> = {};

  if (materia) Object.assign(maxima, maximosDe(materia));

  if (filaMaximos !== null) {
    const fila = filas[filaMaximos];
    for (const [dimension, indice] of Object.entries(encabezado.dimensiones)) {
      const valor = aNumero(fila[indice]);
      if (valor !== null && valor > 0) maxima[dimension] = valor;
    }
    for (const [id, indice] of Object.entries(encabezado.reactivos)) {
      const valor = aNumero(fila[indice]);
      if (valor !== null && valor > 0) maxima[id] = valor;
    }
  }

  // Máximos observados por dimensión, solo si no hay máxima declarada ni catálogo.
  const observados: Record<string, number> = {};
  for (const [dimension, indice] of Object.entries(encabezado.dimensiones)) {
    let mayor = 0;
    for (let i = (filaMaximos ?? 0) + 1; i < filas.length; i++) {
      const valor = aNumero(filas[i]?.[indice]);
      if (valor !== null && valor > mayor) mayor = valor;
    }
    observados[dimension] = mayor;
    if (maxima[dimension] === undefined && mayor > 0) {
      maxima[dimension] = mayor;
      advertencias.push(
        `No se declaró el máximo de ${dimension} en «${nombreMateria}»; se usó el mayor valor observado (${mayor}). Confirme el máximo con el docente.`,
      );
    }
  }

  const registros: RegistroLeido[] = [];
  const sinNota: Array<{ nombre: string; correo: string }> = [];
  const nombresVistos = new Map<string, number>();

  for (let i = (filaMaximos ?? 0) + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || esFilaVacia(fila)) continue;

    const nombreBruto = fila[encabezado.indiceNombre];
    const nombre = typeof nombreBruto === 'string' ? nombreBruto.trim().replace(/\s+/g, ' ') : '';
    if (!nombre || pareceNoEstudiante(nombre)) continue;

    const correoBruto = encabezado.indiceCorreo >= 0 ? fila[encabezado.indiceCorreo] : '';
    const correo = typeof correoBruto === 'string' ? correoBruto.trim() : '';

    const puntos: Record<string, number | null> = {};
    for (const [dimension, indice] of Object.entries(encabezado.dimensiones)) {
      const valor = aNumero(fila[indice]);
      puntos[dimension] = valor;
      const max = maxima[dimension];
      if (valor !== null && max !== undefined && valor > max) {
        advertencias.push(
          `${nombre}: la nota de ${dimension} (${valor}) supera el máximo declarado (${max}).`,
        );
      }
    }

    const reactivos: Record<string, number | null> = {};
    for (const [id, indice] of Object.entries(encabezado.reactivos)) {
      reactivos[id] = aNumero(fila[indice]);
    }

    const maximosDisponibles: Record<string, number> = {};
    for (const dimension of Object.keys(encabezado.dimensiones)) {
      if (maxima[dimension] !== undefined) maximosDisponibles[dimension] = maxima[dimension];
    }

    const ponderado = promedioPonderado(puntos, maximosDisponibles);
    if (ponderado.evaluacionesConsideradas.length === 0) {
      sinNota.push({ nombre, correo });
      continue;
    }

    const claveNombre = normalizarTexto(nombre);
    nombresVistos.set(claveNombre, (nombresVistos.get(claveNombre) ?? 0) + 1);

    registros.push({
      nombre,
      correo,
      puntos,
      reactivos,
      promedio: ponderado.pct,
      completo: ponderado.completo,
      evaluacionesAusentes: ponderado.evaluacionesAusentes,
    });
  }

  const duplicados = Array.from(nombresVistos.entries()).filter(([, veces]) => veces > 1);
  if (duplicados.length > 0) {
    advertencias.push(
      `${duplicados.length} nombre(s) aparecen más de una vez en «${nombreMateria}»: la identidad por nombre puede confundir homónimos.`,
    );
  }

  if (registros.length === 0) {
    advertencias.push(`La hoja «${nombreMateria}» no contiene calificaciones utilizables.`);
  }

  return {
    materia: nombreMateria,
    clave: claveMateria(nombreMateria),
    catalogada: !!materia,
    maxima,
    filaMaximos,
    registros,
    sinNota,
    advertencias: Array.from(new Set(advertencias)),
  };
}

/** Convierte los puntos de un registro en porcentajes por dimensión. */
export function porcentajesPorDimension(
  registro: RegistroLeido,
  maxima: Record<string, number>,
): Record<string, number | null> {
  const resultado: Record<string, number | null> = {};
  for (const [dimension, valor] of Object.entries(registro.puntos)) {
    const max = maxima[dimension];
    resultado[dimension] =
      valor === null || valor === undefined || !max ? null : Number(porcentaje(valor, max).toFixed(2));
  }
  return resultado;
}
