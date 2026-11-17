import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function detectarSlotEvaluacion(raw: string): 'p1' | 'p2' | 'p3' | 'directo' | 'otro' {
  const ev = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (/^(?:P1|1|PARCIAL1|PREGUNTA1|SECCIONP1|SECCION1|S1|PRIMERA|EV1|EVALUACION1)$/.test(ev)) {
    return 'p1';
  }
  if (/^(?:P2|2|PARCIAL2|PREGUNTA2|SECCIONP2|SECCION2|S2|SEGUNDA|EV2|EVALUACION2)$/.test(ev)) {
    return 'p2';
  }
  if (/^(?:P3|3|PARCIAL3|PREGUNTA3|SECCIONP3|SECCION3|S3|TERCERA|EV3|EVALUACION3)$/.test(ev)) {
    return 'p3';
  }
  if (/^(?:PROMEDIO|TOTAL|NOTA|FINAL|NOTAFINAL|CALIFICACION)$/.test(ev)) {
    return 'directo';
  }
  return 'otro';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');

    const notasRows = anio
      ? await sql`
          SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, n.nivel, n.anio,
                 e.nombre as est_nombre, e.correo as est_correo,
                 m.nombre as mat_nombre
          FROM notas n
          JOIN estudiantes e ON e.id = n.estudiante_id
          JOIN materias m ON m.id = n.materia_id
          WHERE n.anio = ${anio}
        `
      : await sql`
          SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, n.nivel, n.anio,
                 e.nombre as est_nombre, e.correo as est_correo,
                 m.nombre as mat_nombre
          FROM notas n
          JOIN estudiantes e ON e.id = n.estudiante_id
          JOIN materias m ON m.id = n.materia_id
        `;

    if (notasRows.length === 0) {
      return NextResponse.json({
        success: true,
        anios: [],
        hitosDisponibles: [],
        estudiantes: [],
        materias: [],
        promediosCurso: {},
        mensaje: 'No hay datos guardados para ese filtro.',
      });
    }

    const estructura: Record<
      string,
      {
        nombre: string;
        correo: string;
        niveles: Record<
          string,
          Record<
            string,
            { p1: number; p2: number; p3: number; extraSum: number; directo?: number }
          >
        >;
      }
    > = {};

    const aniosSet = new Set<string>();
    const materiasSet = new Set<string>();
    const nivelesSet = new Set<string>();

    for (const row of notasRows) {
      const nombre = String(row.est_nombre).trim();
      const correo = row.est_correo ? String(row.est_correo).trim() : '';
      const nivel = String(row.nivel || 'Sin nivel').trim();
      const materia = String(row.mat_nombre).trim();
      const valor = Number(row.valor) || 0;
      const anioRow = row.anio ? String(row.anio).trim() : '';

      if (anioRow) aniosSet.add(anioRow);
      materiasSet.add(materia);
      nivelesSet.add(nivel);

      if (!estructura[nombre]) estructura[nombre] = { nombre, correo, niveles: {} };
      if (!estructura[nombre].niveles[nivel]) estructura[nombre].niveles[nivel] = {};
      if (!estructura[nombre].niveles[nivel][materia]) {
        estructura[nombre].niveles[nivel][materia] = { p1: 0, p2: 0, p3: 0, extraSum: 0 };
      }

      const mat = estructura[nombre].niveles[nivel][materia];
      const slot = detectarSlotEvaluacion(String(row.evaluacion || ''));

      if (slot === 'p1') mat.p1 = valor;
      else if (slot === 'p2') mat.p2 = valor;
      else if (slot === 'p3') mat.p3 = valor;
      else if (slot === 'directo') mat.directo = valor;
      else mat.extraSum += valor;
    }

    const nivelesOrdenBase = ['Inicial', 'Intermedio', 'Avanzado'];
    const nivelesExtras = Array.from(nivelesSet).filter((n) => !nivelesOrdenBase.includes(n));
    const nivelesOrden = [...nivelesOrdenBase.filter((n) => nivelesSet.has(n)), ...nivelesExtras];
    const materiasList = Array.from(materiasSet).sort();

    // Detectar por materia y nivel si P1+P2+P3 son secciones ponderadas (<= 100) o parciales independientes sobre 100 (> 100)
    const esPromedioPorParcial: Record<string, boolean> = {};
    for (const nivel of nivelesOrden) {
      for (const mat of materiasList) {
        const sumas = Object.values(estructura)
          .map((e) => e.niveles[nivel]?.[mat])
          .filter(
            (d): d is { p1: number; p2: number; p3: number; extraSum: number; directo?: number } =>
              Boolean(d)
          )
          .map((d) => d.p1 + d.p2 + d.p3 + d.extraSum);

        const maxSuma = sumas.length > 0 ? Math.max(...sumas) : 0;
        esPromedioPorParcial[`${nivel}::${mat}`] = maxSuma > 100.5;
      }
    }

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

        const porMateria: Record<
          string,
          { promedio: number; p1: number; p2: number; p3: number }
        > = {};
        const vals = Object.entries(materias);

        for (const [matNombre, datos] of vals) {
          const sumaTotal = datos.p1 + datos.p2 + datos.p3 + datos.extraSum;
          let notaFinalMat = sumaTotal;

          if (sumaTotal === 0 && typeof datos.directo === 'number') {
            notaFinalMat = datos.directo;
          } else if (esPromedioPorParcial[`${nivel}::${matNombre}`]) {
            const activos = [datos.p1, datos.p2, datos.p3].filter((v) => v > 0);
            notaFinalMat = activos.length > 0 ? sumaTotal / activos.length : 0;
          }

          porMateria[matNombre] = {
            p1: datos.p1,
            p2: datos.p2,
            p3: datos.p3,
            promedio: Number(notaFinalMat.toFixed(1)),
          };
        }

        const p1 = vals.reduce((a, [, m]) => a + m.p1, 0) / vals.length;
        const p2 = vals.reduce((a, [, m]) => a + m.p2, 0) / vals.length;
        const p3 = vals.reduce((a, [, m]) => a + m.p3, 0) / vals.length;
        const promedio =
          Object.values(porMateria).reduce((a, m) => a + m.promedio, 0) / vals.length;

        progresion.push({
          nivel,
          p1: Number(p1.toFixed(1)),
          p2: Number(p2.toFixed(1)),
          p3: Number(p3.toFixed(1)),
          promedio: Number(promedio.toFixed(1)),
          porMateria,
        });
      }

      const promedioConsolidado = progresion.length
        ? progresion.reduce((a, p) => a + p.promedio, 0) / progresion.length
        : 0;
      const tendencia =
        progresion.length >= 2
          ? progresion[progresion.length - 1].promedio - progresion[0].promedio
          : 0;

      return {
        nombre: est.nombre,
        correo: est.correo,
        progresion,
        promedioConsolidado: Number(promedioConsolidado.toFixed(1)),
        tendencia: Number(tendencia.toFixed(1)),
        tendenciaLabel: tendencia > 2 ? 'Mejora' : tendencia < -2 ? 'Retroceso' : 'Estable',
      };
    });

    estudiantes.sort((a, b) => b.promedioConsolidado - a.promedioConsolidado);

    const promediosCurso: Record<string, Record<string, number>> = {};
    for (const nivel of nivelesOrden) {
      const estudiantesConNivel = estudiantes.filter((e) =>
        e.progresion.some((p) => p.nivel === nivel)
      );
      if (estudiantesConNivel.length === 0) continue;
      promediosCurso[nivel] = {};
      for (const mat of materiasList) {
        const vals = estudiantesConNivel
          .map((e) => e.progresion.find((p) => p.nivel === nivel)?.porMateria[mat]?.promedio)
          .filter((v): v is number => typeof v === 'number');
        promediosCurso[nivel][mat] = vals.length
          ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
          : 0;
      }
    }

    return NextResponse.json({
      success: true,
      anios: Array.from(aniosSet).sort(),
      hitosDisponibles: nivelesOrden,
      estudiantes,
      materias: materiasList,
      promediosCurso,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}