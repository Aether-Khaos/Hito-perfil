/**
 * Escala institucional de logro y utilidades de normalización.
 *
 * Los cortes provienen del informe institucional de la UAB
 * «Informe de evaluación del Hito Inicial del Perfil de Egreso y Plan 2026»:
 * Inicio 0–30, Proceso 31–50, Logrado 51–70, Destacado 71–89, Excepcional 90–100.
 *
 * Regla implementada: los cortes se aplican sobre el porcentaje de logro
 * (puntos obtenidos / puntos posibles × 100), no sobre puntos brutos.
 */

export type NivelId = 'inicio' | 'proceso' | 'logrado' | 'destacado' | 'excepcional';

export interface NivelLogro {
  id: NivelId;
  etiqueta: string;
  min: number;
  max: number;
  descripcion: string;
}

export const NIVELES_UAB: readonly NivelLogro[] = [
  {
    id: 'inicio',
    etiqueta: 'Inicio',
    min: 0,
    max: 30,
    descripcion:
      'Evidencia el inicio de su desarrollo de competencias y necesita mejorar significativamente.',
  },
  {
    id: 'proceso',
    etiqueta: 'Proceso',
    min: 31,
    max: 50,
    descripcion:
      'Evidencia un progreso parcial y está en camino de alcanzar la competencia deseada.',
  },
  {
    id: 'logrado',
    etiqueta: 'Logrado',
    min: 51,
    max: 70,
    descripcion: 'Ha alcanzado un nivel satisfactorio de competencia.',
  },
  {
    id: 'destacado',
    etiqueta: 'Destacado',
    min: 71,
    max: 89,
    descripcion: 'Muestra un desempeño superior en la competencia.',
  },
  {
    id: 'excepcional',
    etiqueta: 'Excepcional',
    min: 90,
    max: 100,
    descripcion: 'Exhibe un dominio excepcional y completo de las competencias.',
  },
];

export const UMBRAL_LOGRADO = 51;

export function acotar(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor)) return min;
  return Math.min(Math.max(valor, min), max);
}

/** Convierte puntos sobre un máximo en porcentaje de logro (0–100). */
export function porcentaje(puntos: number, maximo: number): number {
  if (!Number.isFinite(puntos) || !Number.isFinite(maximo) || maximo <= 0) return 0;
  return acotar((puntos / maximo) * 100, 0, 100);
}

/** Devuelve el nivel institucional correspondiente a un porcentaje de logro. */
export function nivelDeLogro(porcentajeLogro: number): NivelLogro {
  const pct = acotar(porcentajeLogro, 0, 100);
  if (pct <= 30) return NIVELES_UAB[0];
  if (pct <= 50) return NIVELES_UAB[1];
  if (pct <= 70) return NIVELES_UAB[2];
  if (pct < 90) return NIVELES_UAB[3];
  return NIVELES_UAB[4];
}

export interface ResultadoPonderado {
  /** Puntos obtenidos sumando solo las evaluaciones con nota. */
  puntos: number;
  /** Máximo posible de las evaluaciones con nota. */
  maximoDisponible: number;
  /** Máximo del instrumento completo. */
  maximoTotal: number;
  /** Porcentaje sobre el máximo disponible. */
  pct: number;
  /** Porcentaje sobre el máximo del instrumento (notas ausentes = 0). */
  pctSobreTotal: number;
  evaluacionesConsideradas: string[];
  evaluacionesAusentes: string[];
  completo: boolean;
}

/**
 * Promedio ponderado por máximos: Σ puntos / Σ máximos × 100.
 *
 * Una evaluación sin nota (null o undefined) no se cuenta como cero: se excluye
 * del numerador y del denominador, y el registro queda marcado como parcial.
 */
export function promedioPonderado(
  puntos: Record<string, number | null | undefined>,
  maximos: Record<string, number>,
): ResultadoPonderado {
  const claves = Object.keys(maximos);
  let sumaPuntos = 0;
  let sumaMaxDisponible = 0;
  let sumaMaxTotal = 0;
  const consideradas: string[] = [];
  const ausentes: string[] = [];

  for (const clave of claves) {
    const max = maximos[clave];
    if (!Number.isFinite(max) || max <= 0) continue;
    sumaMaxTotal += max;
    const valor = puntos[clave];
    if (valor === null || valor === undefined || !Number.isFinite(valor)) {
      ausentes.push(clave);
      continue;
    }
    sumaPuntos += acotar(valor, 0, max);
    sumaMaxDisponible += max;
    consideradas.push(clave);
  }

  const pct = sumaMaxDisponible > 0 ? (sumaPuntos / sumaMaxDisponible) * 100 : 0;
  const pctSobreTotal = sumaMaxTotal > 0 ? (sumaPuntos / sumaMaxTotal) * 100 : 0;

  return {
    puntos: Number(sumaPuntos.toFixed(2)),
    maximoDisponible: sumaMaxDisponible,
    maximoTotal: sumaMaxTotal,
    pct: Number(pct.toFixed(2)),
    pctSobreTotal: Number(pctSobreTotal.toFixed(2)),
    evaluacionesConsideradas: consideradas,
    evaluacionesAusentes: ausentes,
    completo: ausentes.length === 0 && consideradas.length > 0,
  };
}

/** Etiqueta corta de un nivel, segura para usar en tablas. */
export function etiquetaNivel(porcentajeLogro: number): string {
  return nivelDeLogro(porcentajeLogro).etiqueta;
}
