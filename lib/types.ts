export type SeccionActiva = 'general' | 'materia-dashboard' | 'perfil-materia' | 'estudiante';
export interface FilaMateria {
  Nombre: string;
  Correo: string;
  P1: number;
  P2: number;
  P3: number;
  Promedio: number;
}

export interface EstadisticaMateria {
  total: number;
  promedioGeneral: number;
  aprobados: number;
  enRiesgo: number;
  porcentajeAprobados: number;
  porcentajeRiesgo: number;
}

export interface PerfilGeneral {
  fortalezas: string[];
  debilidades: string[];
  consecuencias: string;
}

export interface MateriaEstudiante {
  /** null cuando el archivo solo trae la nota final de la materia. */
  p1: number | null;
  p2: number | null;
  p3: number | null;
  promedio: number;
}

export interface PerfilEstudiante {
  nombre: string;
  correo: string;
  promedioGeneral: number;
  perfilGeneral: PerfilGeneral;
  materias: Record<string, MateriaEstudiante>;
  /** Figura en la lista del curso pero no tiene ninguna nota registrada. */
  noSePresento?: boolean;
}

export interface ResultadoAuditoria {
  success: boolean;
  estadisticasMaterias: Record<string, EstadisticaMateria>;
  datosMaterias: Record<string, FilaMateria[]>;
  perfilesEstudiantes: PerfilEstudiante[];
  /** Estudiantes de la lista sin nota en cada materia (no se presentaron). */
  noPresentados?: Record<string, Array<{ Nombre: string; Correo: string }>>;
  /** El archivo solo trae la nota final por materia (sin P1–P3). */
  soloPorMateria?: boolean;
  error?: string;
}

export interface RangoDistribucion {
  label: string;
  min: number;
  max: number;
  count: number;
  color: 'rose' | 'amber' | 'yellow' | 'cyan' | 'emerald';
}
