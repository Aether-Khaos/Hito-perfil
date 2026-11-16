import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');

    let notasRows;
    if (anio) {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, n.nivel, n.anio,
               e.nombre as est_nombre, e.correo as est_correo,
               m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
        WHERE n.anio = ${anio}
      `;
    } else {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, n.nivel, n.anio,
               e.nombre as est_nombre, e.correo as est_correo,
               m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
      `;
    }

    if (notasRows.length === 0) {
      return NextResponse.json({
        success: true,
        anios: [],
        estudiantes: [],
        materias: [],
        promediosCurso: {},
        mensaje: 'No hay datos guardados para ese filtro.',
      });
    }

    // Estructura
    const estructura: Record<string, {
      nombre: string;
      correo: string;
      niveles: Record<string, Record<string, { p1: number; p2: number; p3: number }>>;
    }> = {};

    const aniosSet = new Set<string>();
    const materiasSet = new Set<string>();

    for (const row of notasRows) {
      const nombre = String(row.est_nombre);
      const correo = row.est_correo ? String(row.est_correo) : '';
      const nivel = String(row.nivel || 'Sin nivel');
      const materia = String(row.mat_nombre);
      const evaluacion = String(row.evaluacion);
      const valor = Number(row.valor);
      const anioRow = row.anio ? String(row.anio) : '';
      if (anioRow) aniosSet.add(anioRow);
      materiasSet.add(materia);

      if (!estructura[nombre]) estructura[nombre] = { nombre, correo, niveles: {} };
      if (!estructura[nombre].niveles[nivel]) estructura[nombre].niveles[nivel] = {};
      if (!estructura[nombre].niveles[nivel][materia]) estructura[nombre].niveles[nivel][materia] = { p1: 0, p2: 0, p3: 0 };
      const mat = estructura[nombre].niveles[nivel][materia];
      if (evaluacion === 'P1') mat.p1 = valor;
      else if (evaluacion === 'P2') mat.p2 = valor;
      else if (evaluacion === 'P3') mat.p3 = valor;
    }

    const nivelesOrden = ['Inicial', 'Intermedio', 'Avanzado'];
    const materiasList = Array.from(materiasSet).sort();

    // Progresión por estudiante (incluyendo detalle por materia)
    const estudiantes = Object.values(estructura).map((est) => {
      const progresion: Array<{
        nivel: string;
        p1: number;
        p2: number;
        p3: number;
        promedio: number;
        porMateria: Record<string, { promedio: number; p1: number; p2: number; p3: number }>;
      }> = [];

      for (const nivel of nivelesOrden) {
        const materias = est.niveles[nivel];
        if (!materias || Object.keys(materias).length === 0) continue;

        const porMateria: Record<string, { promedio: number; p1: number; p2: number; p3: number }> = {};
        const vals = Object.entries(materias);
        for (const [matNombre, datos] of vals) {
          porMateria[matNombre] = {
            p1: datos.p1,
            p2: datos.p2,
            p3: datos.p3,
            promedio: (datos.p1 + datos.p2 + datos.p3) / 3,
          };
        }
        const p1 = vals.reduce((a, [, m]) => a + m.p1, 0) / vals.length;
        const p2 = vals.reduce((a, [, m]) => a + m.p2, 0) / vals.length;
        const p3 = vals.reduce((a, [, m]) => a + m.p3, 0) / vals.length;
        const promedio = (p1 + p2 + p3) / 3;

        progresion.push({ nivel, p1, p2, p3, promedio, porMateria });
      }

      const promedioConsolidado = progresion.length
        ? progresion.reduce((a, p) => a + p.promedio, 0) / progresion.length
        : 0;
      const tendencia = progresion.length >= 2
        ? progresion[progresion.length - 1].promedio - progresion[0].promedio
        : 0;

      return {
        nombre: est.nombre,
        correo: est.correo,
        progresion,
        promedioConsolidado,
        tendencia,
        tendenciaLabel: tendencia > 2 ? 'Mejora' : tendencia < -2 ? 'Retroceso' : 'Estable',
      };
    });

    estudiantes.sort((a, b) => b.promedioConsolidado - a.promedioConsolidado);

    // Promedios del curso por nivel y por materia
    const promediosCurso: Record<string, Record<string, number>> = {};
    for (const nivel of nivelesOrden) {
      const estudiantesConNivel = estudiantes.filter((e) => e.progresion.some((p) => p.nivel === nivel));
      if (estudiantesConNivel.length === 0) continue;
      promediosCurso[nivel] = {};
      for (const mat of materiasList) {
        const vals = estudiantesConNivel
          .map((e) => e.progresion.find((p) => p.nivel === nivel)?.porMateria[mat]?.promedio)
          .filter((v): v is number => typeof v === 'number');
        promediosCurso[nivel][mat] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
    }

    return NextResponse.json({
      success: true,
      anios: Array.from(aniosSet).sort(),
      estudiantes,
      materias: materiasList,
      promediosCurso,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}