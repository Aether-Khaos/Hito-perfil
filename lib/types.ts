export type SeccionActiva = 'materia-dashboard' | 'perfil-materia' | 'estudiante';

export interface FilaMateria {
  Nombre: string;
  Correo: string;
  /** Porcentaje de dominio (0–100) o `null` si esa evaluación no tiene nota. */
  P1: number | null;
  P2: number | null;
  P3: number | null;
  /** Asignaturas con una sola columna de evaluación (por ejemplo Lógica). */
  Global?: number | null;
  /** Promedio ponderado por máximos, en escala 0–100. */
  Promedio: number;
  completo?: boolean;
}

export interface EstadisticaMateria {
  total: number;
  promedioGeneral: number;
  aprobados: number;
  regulares?: number;
  enRiesgo: number;
  porcentajeAprobados: number;
  porcentajeRegulares?: number;
  porcentajeRiesgo: number;
}

export interface PerfilGeneral {
  fortalezas: string[];
  debilidades: string[];
  consecuencias: string;
}

export interface MateriaEstudiante {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  global?: number | null;
  promedio: number;
}

export interface PerfilEstudiante {
  nombre: string;
  correo: string;
  promedioGeneral: number;
  perfilGeneral: PerfilGeneral;
  materias: Record<string, MateriaEstudiante>;
}

export interface ResultadoAuditoria {
  success: boolean;
  escala?: number;
  estadisticasMaterias: Record<string, EstadisticaMateria>;
  datosMaterias: Record<string, FilaMateria[]>;
  perfilesEstudiantes: PerfilEstudiante[];
  maximosPorMateria?: Record<string, Record<string, number>>;
  catalogadas?: Record<string, boolean>;
  advertencias?: string[];
  /** Perfiles de competencia calculados por `lib/diagnostico`. */
  diagnosticos?: unknown[];
  resumenCurso?: unknown[];
  hojasProcesadas?: Array<{ materia: string; registros: number; catalogada: boolean }>;
  error?: string;
}

export interface RangoDistribucion {
  label: string;
  min: number;
  max: number;
  count: number;
  color: 'rose' | 'amber' | 'yellow' | 'cyan' | 'emerald';
}
