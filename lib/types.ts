export type SeccionActiva = 'materia-dashboard' | 'perfil-materia' | 'estudiante';

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
  p1: number;
  p2: number;
  p3: number;
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
  estadisticasMaterias: Record<string, EstadisticaMateria>;
  datosMaterias: Record<string, FilaMateria[]>;
  perfilesEstudiantes: PerfilEstudiante[];
  error?: string;
}

export interface RangoDistribucion {
  label: string;
  min: number;
  max: number;
  count: number;
  color: 'rose' | 'amber' | 'yellow' | 'cyan' | 'emerald';
}
