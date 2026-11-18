import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sql, hayBaseDeDatos } from '@/lib/db';
import { crearClienteGoogle, explicarErrorGoogle } from '@/lib/google-auth';
import type { FilaMateriaInput } from '@/lib/types-db';

const PESTANAS_IGNORADAS = ['resumen', 'config', 'configuracion', 'configuración', 'inicio', 'portada', 'indice', 'índice', 'readme', 'ayuda'];

function esPestanaMateria(titulo: string): boolean {
  const t = titulo.trim().toLowerCase();
  if (!t) return false;
  return !PESTANAS_IGNORADAS.some((ignorada) => t === ignorada || t.startsWith(ignorada + ' '));
}

export async function POST(request: Request) {
  try {
    const { url, anio, nivel } = await request.json();
    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ success: false, error: 'Falta la URL del Google Sheet.' }, { status: 400 });
    }
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ success: false, error: 'URL de Google Sheets no válida' }, { status: 400 });
    }
    const spreadsheetId = match[1];

    const auth = crearClienteGoogle();

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const hojas = spreadsheet.data.sheets || [];

    const datosMaterias: Record<string, FilaMateriaInput[]> = {};
    const estadisticasMaterias: Record<string, Record<string, number>> = {};
    const estudiantesMap: Record<string, { nombre: string; correo: string; materias: Record<string, { p1: number; p2: number; p3: number; promedio: number }> }> = {};
    let maxNotaDetectada = 0;

    for (const hoja of hojas) {
      const tituloHoja = hoja.properties?.title || '';
      if (!esPestanaMateria(tituloHoja)) continue;

      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: tituloHoja });
      const filas = res.data.values || [];

      if (filas.length > 1) {
        const encabezados = filas[0].map((h: string) => (h ? h.trim().toLowerCase() : ''));
        const idxNombre = encabezados.findIndex((h: string) => h.includes('nombre') || h === 'estudiante');
        const idxCorreo = encabezados.findIndex((h: string) => h.includes('correo') || h.includes('email'));

        const registrosValidos: FilaMateriaInput[] = [];

        for (let i = 1; i < filas.length; i++) {
          const fila = filas[i];
          if (!fila || fila.length === 0) continue;

          let nombre = idxNombre !== -1 ? fila[idxNombre] : fila[1] || '';
          const correo = idxCorreo !== -1 ? fila[idxCorreo] : fila[2] || '';

          if (!nombre || typeof nombre !== 'string') continue;
          nombre = nombre.trim();
          if (nombre === '') continue;
          const nombreLower = nombre.toLowerCase();
          if (nombreLower.includes('puntaje') || nombreLower.includes('promedio') || nombreLower.includes('notas') || nombreLower.includes('total')) continue;

          const notasFila: number[] = [];
          fila.forEach((val: string, idx: number) => {
            if (idx > 2 && val !== undefined && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) notasFila.push(num);
            }
          });

          const p1 = notasFila[0] ?? 0;
          const p2 = notasFila[1] ?? 0;
          const p3 = notasFila[2] ?? 0;
          const promedioMateria = (p1 + p2 + p3) / (notasFila.length > 0 ? Math.min(notasFila.length, 3) : 1);

          if (p1 > maxNotaDetectada) maxNotaDetectada = p1;
          if (p2 > maxNotaDetectada) maxNotaDetectada = p2;
          if (p3 > maxNotaDetectada) maxNotaDetectada = p3;
          if (promedioMateria > maxNotaDetectada) maxNotaDetectada = promedioMateria;

          registrosValidos.push({
            Nombre: nombre,
            Correo: correo ? correo.trim() : '',
            P1: p1,
            P2: p2,
            P3: p3,
            Promedio: promedioMateria,
          });

          if (!estudiantesMap[nombre]) {
            estudiantesMap[nombre] = { nombre, correo: correo ? correo.trim() : '', materias: {} };
          }
          estudiantesMap[nombre].materias[tituloHoja] = { p1, p2, p3, promedio: promedioMateria };
        }

        datosMaterias[tituloHoja] = registrosValidos;
      }
    }

    const escala = maxNotaDetectada > 20 ? 100 : 20;
    const umbralAprobado = escala * 0.7;
    const umbralRegular = escala * 0.5;

    for (const tituloHoja of Object.keys(datosMaterias)) {
      const registros = datosMaterias[tituloHoja];
      let sumPromedios = 0;
      let aprobados = 0;
      let regulares = 0;
      let enRiesgo = 0;

      registros.forEach((reg) => {
        sumPromedios += reg.Promedio;
        if (reg.Promedio >= umbralAprobado) aprobados++;
        else if (reg.Promedio >= umbralRegular) regulares++;
        else enRiesgo++;
      });

      const total = registros.length;
      estadisticasMaterias[tituloHoja] = {
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

    // GUARDAR EN NEON (BATCH)
    let guardadoEnBase = false;
    let avisoBase: string | null = null;
    if (!hayBaseDeDatos()) {
      avisoBase = 'DATABASE_URL no configurada: los datos se analizaron pero no se guardaron.';
      console.warn('⚠️ ' + avisoBase);
    } else try {
      const anioGuardar = anio || '2026';
      const nivelGuardar = nivel || 'Inicial';

      const nombresMaterias = Object.keys(datosMaterias);
      if (nombresMaterias.length > 0) {
        await sql`
          INSERT INTO materias (nombre)
          SELECT unnest(${nombresMaterias}::text[])
          ON CONFLICT (nombre) DO NOTHING
        `;
      }

      const materiasRows = await sql`SELECT id, nombre FROM materias`;
      const materiaIdMap: Record<string, number> = {};
      for (const row of materiasRows) {
        materiaIdMap[String(row.nombre)] = Number(row.id);
      }

      const estudiantesUnicos = new Map<string, string>();
      for (const filas of Object.values(datosMaterias)) {
        for (const fila of filas) {
          if (!estudiantesUnicos.has(fila.Nombre)) {
            estudiantesUnicos.set(fila.Nombre, fila.Correo);
          }
        }
      }

      const nombresEst = Array.from(estudiantesUnicos.keys());
      const correosEst = Array.from(estudiantesUnicos.values());
      if (nombresEst.length > 0) {
        await sql`
          INSERT INTO estudiantes (nombre, correo)
          SELECT * FROM unnest(${nombresEst}::text[], ${correosEst}::text[])
          ON CONFLICT (nombre) DO UPDATE SET correo = EXCLUDED.correo
        `;
      }

      const estudiantesRows = await sql`SELECT id, nombre FROM estudiantes`;
      const estudianteIdMap: Record<string, number> = {};
      for (const row of estudiantesRows) {
        estudianteIdMap[String(row.nombre)] = Number(row.id);
      }

      const notasEstudianteId: number[] = [];
      const notasMateriaId: number[] = [];
      const notasEvaluacion: string[] = [];
      const notasValor: number[] = [];
      const notasAnio: string[] = [];
      const notasNivel: string[] = [];

      for (const [materiaNombre, filas] of Object.entries(datosMaterias)) {
        const materiaId = materiaIdMap[materiaNombre];
        if (!materiaId) continue;
        for (const fila of filas) {
          const estudianteId = estudianteIdMap[fila.Nombre];
          if (!estudianteId) continue;
          for (const ev of [
            { evaluacion: 'P1', valor: fila.P1 },
            { evaluacion: 'P2', valor: fila.P2 },
            { evaluacion: 'P3', valor: fila.P3 },
          ]) {
            notasEstudianteId.push(estudianteId);
            notasMateriaId.push(materiaId);
            notasEvaluacion.push(ev.evaluacion);
            notasValor.push(ev.valor);
            notasAnio.push(anioGuardar);
            notasNivel.push(nivelGuardar);
          }
        }
      }

      if (notasEstudianteId.length > 0) {
        await sql`
          INSERT INTO notas (estudiante_id, materia_id, evaluacion, valor, anio, nivel)
          SELECT * FROM unnest(
            ${notasEstudianteId}::int[],
            ${notasMateriaId}::int[],
            ${notasEvaluacion}::text[],
            ${notasValor}::numeric[],
            ${notasAnio}::text[],
            ${notasNivel}::text[]
          )
          ON CONFLICT (estudiante_id, materia_id, evaluacion)
          DO UPDATE SET valor = EXCLUDED.valor, anio = EXCLUDED.anio, nivel = EXCLUDED.nivel
        `;
      }

      guardadoEnBase = true;
      console.log(`✅ Guardado: ${nombresEst.length} estudiantes, ${notasEstudianteId.length} notas (${anioGuardar}/${nivelGuardar})`);
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : 'Error desconocido';
      avisoBase = `No se pudo guardar en la base de datos: ${msg}`;
      console.error('❌ Error guardando en Neon:', msg);
    }

    return NextResponse.json({
      success: true,
      guardadoEnBase,
      avisoBase,
      escala,
      datosMaterias,
      estadisticasMaterias,
      perfilesEstudiantes: Object.values(estudiantesMap).map((est) => {
        const notas = Object.values(est.materias).map((m) => m.promedio);
        const promedioGeneral = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
        return {
          ...est,
          promedioGeneral,
          perfilGeneral: {
            fortalezas: ['Datos cargados correctamente.'],
            debilidades: ['Sin análisis cualitativo en esta versión.'],
            consecuencias: `Promedio general: ${promedioGeneral.toFixed(1)} pts.`,
          },
        };
      }).sort((a, b) => b.promedioGeneral - a.promedioGeneral),
    });
  } catch (error) {
    const { mensaje, status } = explicarErrorGoogle(error);
    console.error('❌ /api/perfiles:', mensaje);
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}