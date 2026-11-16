import { NextResponse } from 'next/server';
import { CATALOGO_REACTIVOS, buscarMateria } from '@/lib/catalogo-reactivos';
import { diagnosticarEstudiante, resumirCurso, type NotasMateria } from '@/lib/diagnostico';
import { NIVELES_UAB } from '@/lib/escala';

interface FilaEntrada {
  materia?: string;
  nombre?: string;
  correo?: string;
  /** Puntaje por dimensión: { P1: 12, P2: 18, P3: 14 } o { GLOBAL: 70 }. */
  puntos?: Record<string, number | null>;
  /** Puntaje por reactivo cuando el libro trae detalle por ítem. */
  reactivos?: Record<string, number | null>;
}

/**
 * GET describe el servicio (no hay base de datos en esta versión: el diagnóstico
 * se calcula en memoria a partir de las filas enviadas).
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    servicio: 'diagnostico-por-competencias',
    metodo: 'POST',
    entrada: {
      filas: [
        {
          materia: 'Fundamentos de Matematicas',
          nombre: 'Estudiante de ejemplo',
          correo: 'ejemplo@uab.edu.bo',
          puntos: { P1: 10, P2: 30, P3: 20 },
          reactivos: { 'MAT-1.2': 0 },
        },
      ],
    },
    banco: CATALOGO_REACTIVOS.map((materia) => ({
      nombre: materia.nombre,
      hito: materia.hito,
      instrumento: materia.instrumento,
      dimensiones: materia.dimensiones.map((dimension) => ({
        id: dimension.id,
        max: dimension.max,
        reactivos: dimension.reactivos.map((reactivo) => ({
          id: reactivo.id,
          nombre: reactivo.nombre,
          puntos: reactivo.puntos,
        })),
      })),
    })),
    niveles: NIVELES_UAB,
  });
}

/**
 * Calcula el perfil de competencias de cada estudiante a partir de las filas
 * normalizadas del libro de calificaciones.
 */
export async function POST(request: Request) {
  try {
    const cuerpo = await request.json().catch(() => null);
    const filas = (cuerpo as { filas?: FilaEntrada[] } | null)?.filas;

    if (!Array.isArray(filas) || filas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se esperaba un arreglo «filas» con al menos un registro.' },
        { status: 400 },
      );
    }

    const porEstudiante = new Map<string, { correo: string; entradas: NotasMateria[] }>();
    const descartadas: string[] = [];

    for (const fila of filas) {
      const nombre = typeof fila?.nombre === 'string' ? fila.nombre.trim() : '';
      const materia = typeof fila?.materia === 'string' ? fila.materia.trim() : '';
      if (!nombre || !materia) {
        descartadas.push('Registro sin nombre o sin asignatura.');
        continue;
      }
      if (!porEstudiante.has(nombre)) porEstudiante.set(nombre, { correo: fila.correo ?? '', entradas: [] });
      porEstudiante.get(nombre)!.entradas.push({
        materia,
        puntos: fila.puntos ?? {},
        reactivos: fila.reactivos ?? {},
      });
    }

    const buscar = (nombre: string) => buscarMateria(nombre);
    const diagnosticos = Array.from(porEstudiante.entries()).map(([nombre, registro]) =>
      diagnosticarEstudiante(nombre, registro.entradas, buscar),
    );

    return NextResponse.json({
      success: true,
      escala: 100,
      niveles: NIVELES_UAB,
      estudiantes: diagnosticos,
      resumenCurso: resumirCurso(diagnosticos),
      descartadas: Array.from(new Set(descartadas)),
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en el diagnóstico:', mensaje);
    return NextResponse.json(
      { success: false, error: 'No se pudo calcular el diagnóstico por competencias.' },
      { status: 500 },
    );
  }
}
