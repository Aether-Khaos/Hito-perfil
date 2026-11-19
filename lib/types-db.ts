export interface EstudianteRow {
  id: number;
  nombre: string;
  correo: string | null;
}

export interface MateriaRow {
  id: number;
  nombre: string;
}

export interface FilaMateriaInput {
  Nombre: string;
  Correo: string;
  P1: number;
  P2: number;
  P3: number;
  Promedio: number;
}
