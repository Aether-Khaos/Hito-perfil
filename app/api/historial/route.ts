import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');
    const nivel = searchParams.get('nivel');

    let notasRows;
    if (anio && nivel) {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, e.nombre as est_nombre, e.correo as est_correo, m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
        WHERE n.anio = ${anio} AND n.nivel = ${nivel}
      `;
    } else if (anio) {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, e.nombre as est_nombre, e.correo as est_correo, m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
        WHERE n.anio = ${anio}
      `;
    } else if (nivel) {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, e.nombre as est_nombre, e.correo as est_correo, m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
        WHERE n.nivel = ${nivel}
      `;
    } else {
      notasRows = await sql`
        SELECT n.estudiante_id, n.materia_id, n.evaluacion, n.valor, e.nombre as est_nombre, e.correo as est_correo, m.nombre as mat_nombre
        FROM notas n
        JOIN estudiantes e ON e.id = n.estudiante_id
        JOIN materias m ON m.id = n.materia_id
      `;
    }

    if (notasRows.length === 0) {
      return NextResponse.json({
        success: true,
        datosMaterias: {},
        estadisticasMaterias: {},
        perfilesEstudiantes: [],
        mensaje: 'No hay datos guardados para ese filtro.',
      });
    }

    const datosMaterias: Record<string, Array<{ Nombre: string; Correo: string; P1: number; P2: number; P3: number; Promedio: number }>> = {};
    const perfilesMap: Record<string, { nombre: string; correo: string; materias: Record<string, { p1: number; p2: number; p3: number; promedio: number }> }> = {};

    for (const row of notasRows) {
      const estNombre = String(row.est_nombre);
      const estCorreo = row.est_correo ? String(row.est_correo) : '';
      const matNombre = String(row.mat_nombre);
      const evaluacion = String(row.evaluacion);
      const valor = Number(row.valor);

      if (!perfilesMap[estNombre]) {
        perfilesMap[estNombre] = { nombre: estNombre, correo: estCorreo, materias: {} };
      }
      if (!perfilesMap[estNombre].materias[matNombre]) {
        perfilesMap[estNombre].materias[matNombre] = { p1: 0, p2: 0, p3: 0, promedio: 0 };
      }
      const matData = perfilesMap[estNombre].materias[matNombre];
      if (evaluacion === 'P1') matData.p1 = valor;
      else if (evaluacion === 'P2') matData.p2 = valor;
      else if (evaluacion === 'P3') matData.p3 = valor;
    }

    for (const [estNombre, estData] of Object.entries(perfilesMap)) {
      for (const [matNombre, matData] of Object.entries(estData.materias)) {
        matData.promedio = (matData.p1 + matData.p2 + matData.p3) / 3;
        if (!datosMaterias[matNombre]) datosMaterias[matNombre] = [];
        datosMaterias[matNombre].push({
          Nombre: estNombre,
          Correo: estData.correo,
          P1: matData.p1,
          P2: matData.p2,
          P3: matData.p3,
          Promedio: matData.promedio,
        });
      }
    }

    const estadisticasMaterias: Record<string, { total: number; promedioGeneral: number; porcentajeAprobados: number; porcentajeRegulares: number; porcentajeRiesgo: number; aprobados: number; regulares: number; enRiesgo: number }> = {};
    const escala = 20;
    const umbralAprobado = escala * 0.7;
    const umbralRegular = escala * 0.5;

    for (const [matNombre, filas] of Object.entries(datosMaterias)) {
      let sumPromedios = 0;
      let aprobados = 0;
      let regulares = 0;
      let enRiesgo = 0;
      for (const f of filas) {
        sumPromedios += f.Promedio;
        if (f.Promedio >= umbralAprobado) aprobados++;
        else if (f.Promedio >= umbralRegular) regulares++;
        else enRiesgo++;
      }
      const total = filas.length;
      estadisticasMaterias[matNombre] = {
        total,
        promedioGeneral: total > 0 ? sumPromedios / total : 0,
        porcentajeAprobados: total > 0 ? (aprobados / total) * 100 : 0,
        porcentajeRegulares: total > 0 ? (regulares / total) * 100 : 0,
        porcentajeRiesgo: total > 0 ? (enRiesgo / total) * 100 : 0,
        aprobados,
        regulares,
        enRiesgo,
      };
    }

    const perfilesEstudiantes = Object.values(perfilesMap).map((est) => {
      const notasTotales = Object.values(est.materias).map((m) => m.promedio);
      const promedioGeneral = notasTotales.length ? notasTotales.reduce((a, b) => a + b, 0) / notasTotales.length : 0;
      const ordenadas = Object.entries(est.materias).sort((a, b) => b[1].promedio - a[1].promedio);
      const mejor = ordenadas[0];
      const peor = ordenadas[ordenadas.length - 1];
      const fortalezas: string[] = [];
      const debilidades: string[] = [];
      if (mejor) fortalezas.push(`Materia más fuerte: ${mejor[0]} (${mejor[1].promedio.toFixed(1)} pts).`);
      if (peor && ordenadas.length > 1) debilidades.push(`Materia más débil: ${peor[0]} (${peor[1].promedio.toFixed(1)} pts).`);
      if (promedioGeneral >= umbralAprobado) fortalezas.push('Promedio general en zona de aprobación.');
      else if (promedioGeneral < umbralRegular) debilidades.push('Promedio general en zona de riesgo.');
      if (fortalezas.length === 0) fortalezas.push('Sin fortalezas destacadas.');
      if (debilidades.length === 0) debilidades.push('Sin debilidades críticas.');
      return {
        ...est,
        promedioGeneral,
        perfilGeneral: {
          fortalezas,
          debilidades,
          consecuencias: `Promedio general: ${promedioGeneral.toFixed(1)} pts.`,
        },
      };
    });

    perfilesEstudiantes.sort((a, b) => b.promedioGeneral - a.promedioGeneral);

    return NextResponse.json({
      success: true,
      escala,
      datosMaterias,
      estadisticasMaterias,
      perfilesEstudiantes,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}