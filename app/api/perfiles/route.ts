import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const PESTANAS_IGNORADAS = ['resumen', 'config', 'configuracion', 'configuración', 'inicio', 'portada', 'indice', 'índice', 'readme', 'ayuda'];

function esPestanaMateria(titulo: string): boolean {
  const t = titulo.trim().toLowerCase();
  if (!t) return false;
  return !PESTANAS_IGNORADAS.some((ignorada) => t === ignorada || t.startsWith(ignorada + ' '));
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return NextResponse.json({ success: false, error: 'URL de Google Sheets no válida' }, { status: 400 });

    const spreadsheetId = match[1];
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'keys.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const hojas = spreadsheet.data.sheets || [];

    const datosMaterias: Record<string, any[]> = {};
    const estadisticasMaterias: Record<string, any> = {};
    const estudiantesMap: Record<string, any> = {};
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

        const registrosValidos: any[] = [];

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
          fila.forEach((val: any, idx: number) => {
            if (idx > 2 && val !== undefined && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) notasFila.push(num);
            }
          });

          const p1 = notasFila[0] !== undefined ? notasFila[0] : 0;
          const p2 = notasFila[1] !== undefined ? notasFila[1] : 0;
          const p3 = notasFila[2] !== undefined ? notasFila[2] : 0;
          const promedioMateria = (p1 + p2 + p3) / (notasFila.length > 0 ? Math.min(notasFila.length, 3) : 1);

          if (p1 > maxNotaDetectada) maxNotaDetectada = p1;
          if (p2 > maxNotaDetectada) maxNotaDetectada = p2;
          if (p3 > maxNotaDetectada) maxNotaDetectada = p3;
          if (promedioMateria > maxNotaDetectada) maxNotaDetectada = promedioMateria;

          const registroFinal = {
            'N°': fila[0] || '',
            'Nombre': nombre,
            'Correo': correo ? correo.trim() : '',
            'P1': p1, 'P2': p2, 'P3': p3,
            'Promedio': promedioMateria,
          };
          registrosValidos.push(registroFinal);

          if (!estudiantesMap[nombre]) {
            estudiantesMap[nombre] = { nombre, correo: registroFinal.Correo, materias: {} };
          }
          estudiantesMap[nombre].materias[tituloHoja] = { p1, p2, p3, promedio: promedioMateria };
        }

        datosMaterias[tituloHoja] = registrosValidos;
      }
    }

    const escala = maxNotaDetectada > 20 ? 100 : 20;
    const umbralAprobado = escala * 0.7;
    const umbralRegular = escala * 0.5;

    // Estadísticas por materia
    for (const tituloHoja of Object.keys(datosMaterias)) {
      const registros = datosMaterias[tituloHoja];
      let sumPromedios = 0, aprobados = 0, regulares = 0, enRiesgo = 0;
      registros.forEach((reg: any) => {
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
        aprobados, regulares, enRiesgo,
      };
    }

    // Promedio general del curso (para comparaciones)
    const materiasList = Object.keys(estadisticasMaterias);
    const promedioCursoGlobal = materiasList.length
      ? materiasList.reduce((acc, m) => acc + estadisticasMaterias[m].promedioGeneral, 0) / materiasList.length
      : 0;

    // ============================================================
    // PERFILES DINÁMICOS POR ESTUDIANTE
    // Cada texto se genera desde las notas reales del Sheet
    // ============================================================
    const perfilesEstudiantes = Object.values(estudiantesMap).map((est: any) => {
      const materiasEntries = Object.entries(est.materias) as Array<[string, any]>;
      const notasTotales = materiasEntries.map(([, m]) => m.promedio);
      const promedioGeneral = notasTotales.length
        ? notasTotales.reduce((a, b) => a + b, 0) / notasTotales.length
        : 0;

      // Mejor y peor materia
      const ordenadas = [...materiasEntries].sort((a, b) => b[1].promedio - a[1].promedio);
      const mejor = ordenadas[0];
      const peor = ordenadas[ordenadas.length - 1];

      // Materias en las que está arriba / abajo del curso
      const arribaDelCurso: Array<{ materia: string; diff: number }> = [];
      const abajoDelCurso: Array<{ materia: string; diff: number }> = [];
      materiasEntries.forEach(([mat, d]) => {
        const promMat = estadisticasMaterias[mat]?.promedioGeneral ?? 0;
        const diff = d.promedio - promMat;
        if (diff > 0.5) arribaDelCurso.push({ materia: mat, diff });
        else if (diff < -0.5) abajoDelCurso.push({ materia: mat, diff });
      });

      // Tendencia global (P3-P1 promedio por materia)
      const tendencias = materiasEntries.map(([, m]) => m.p3 - m.p1);
      const tendenciaGlobal = tendencias.length
        ? tendencias.reduce((a, b) => a + b, 0) / tendencias.length
        : 0;

      // Varianza entre materias (regular vs irregular)
      const media = promedioGeneral;
      const varianza = materiasEntries.length > 1
        ? notasTotales.reduce((acc: number, n: number) => acc + Math.pow(n - media, 2), 0) / notasTotales.length
        : 0;
      const desviacion = Math.sqrt(varianza);

      // P1, P2, P3 promediados entre sus materias
      const p1Prom = materiasEntries.reduce((a, [, m]) => a + m.p1, 0) / Math.max(materiasEntries.length, 1);
      const p2Prom = materiasEntries.reduce((a, [, m]) => a + m.p2, 0) / Math.max(materiasEntries.length, 1);
      const p3Prom = materiasEntries.reduce((a, [, m]) => a + m.p3, 0) / Math.max(materiasEntries.length, 1);

      const diffConCurso = promedioGeneral - promedioCursoGlobal;

      // ============================================================
      // FORTALEZAS DINÁMICAS
      // ============================================================
      const fortalezas: string[] = [];
      const debilidades: string[] = [];
      let consecuencias = '';

      // 1. Rendimiento general vs el curso
      if (diffConCurso > 2) {
        fortalezas.push(`Estás ${diffConCurso.toFixed(1)} pts por encima del promedio general del curso (${promedioCursoGlobal.toFixed(1)} pts). Tu desempeño te ubica en el grupo de referencia académica.`);
      } else if (diffConCurso > 0) {
        fortalezas.push(`Estás ligeramente por encima del promedio del curso (+${diffConCurso.toFixed(1)} pts vs ${promedioCursoGlobal.toFixed(1)}). Mantienes un rendimiento competitivo.`);
      } else if (diffConCurso < -2) {
        debilidades.push(`Estás ${Math.abs(diffConCurso).toFixed(1)} pts por debajo del promedio general del curso (${promedioCursoGlobal.toFixed(1)} pts). Necesitas un plan de recuperación focalizado.`);
      }

      // 2. Mejor materia
      if (mejor && mejor[1].promedio > 0) {
        const promMat = estadisticasMaterias[mejor[0]]?.promedioGeneral ?? 0;
        const dif = mejor[1].promedio - promMat;
        if (dif > 0.5) {
          fortalezas.push(`Tu materia más fuerte es ${mejor[0]} con ${mejor[1].promedio.toFixed(1)} pts (${dif >= 0 ? '+' : ''}${dif.toFixed(1)} vs promedio del curso en esa materia). Es tu mejor activo, úsala como palanca.`);
        } else {
          fortalezas.push(`Tu materia más fuerte es ${mejor[0]} con ${mejor[1].promedio.toFixed(1)} pts, alineada con el promedio del curso (${promMat.toFixed(1)}). No destacas pero tampoco estás en desventaja.`);
        }
      }

      // 3. Peor materia
      if (peor && peor[1].promedio > 0 && materiasEntries.length > 1) {
        const promMat = estadisticasMaterias[peor[0]]?.promedioGeneral ?? 0;
        const dif = peor[1].promedio - promMat;
        if (dif < -0.5) {
          debilidades.push(`Tu materia más débil es ${peor[0]} con ${peor[1].promedio.toFixed(1)} pts (${dif.toFixed(1)} vs el curso en esa materia). Es tu foco prioritario de recuperación.`);
        } else {
          debilidades.push(`Tu materia menos fuerte es ${peor[0]} con ${peor[1].promedio.toFixed(1)} pts, aunque no estás por debajo del promedio del curso (${promMat.toFixed(1)}).`);
        }
      }

      // 4. Materias arriba del curso
      if (arribaDelCurso.length >= 2) {
        const nombres = arribaDelCurso.slice(0, 3).map((x) => x.materia).join(', ');
        fortalezas.push(`Superas el promedio del curso en ${arribaDelCurso.length} materias: ${nombres}. Consistencia destacable en varias áreas a la vez.`);
      } else if (arribaDelCurso.length === 1) {
        fortalezas.push(`Superas el promedio del curso en ${arribaDelCurso[0].materia}. Es tu punto más sólido frente a los compañeros.`);
      }

      // 5. Materias abajo del curso
      if (abajoDelCurso.length >= 2) {
        const nombres = abajoDelCurso.slice(0, 3).map((x) => x.materia).join(', ');
        debilidades.push(`Estás por debajo del promedio del curso en ${abajoDelCurso.length} materias: ${nombres}. Patrón de dificultad sostenida, requiere apoyo en varias áreas simultáneamente.`);
      } else if (abajoDelCurso.length === 1) {
        debilidades.push(`Estás por debajo del promedio del curso únicamente en ${abajoDelCurso[0].materia}. Aislar esa dificultad es viable: con refuerzo focalizado, el resto del perfil se mantiene estable.`);
      }

      // 6. Tendencia global
      if (tendenciaGlobal > 1.5) {
        fortalezas.push(`Tendencia positiva sostenida: en promedio mejoraste +${tendenciaGlobal.toFixed(1)} pts entre P1 y P3 considerando todas tus materias. Tu curva es ascendente.`);
      } else if (tendenciaGlobal < -1.5) {
        debilidades.push(`Tendencia negativa: en promedio bajaste ${Math.abs(tendenciaGlobal).toFixed(1)} pts entre P1 y P3. El patrón de retroceso es transversal, no de una sola materia.`);
      } else {
        fortalezas.push(`Tu rendimiento es estable a lo largo del hito: la diferencia entre P1 y P3 es mínima (${tendenciaGlobal >= 0 ? '+' : ''}${tendenciaGlobal.toFixed(1)} pts). Esto indica consistencia, aunque también falta de aceleración.`);
      }

      // 7. Evaluación más fuerte / más débil
      const evals = [
        { nombre: 'P1', valor: p1Prom },
        { nombre: 'P2', valor: p2Prom },
        { nombre: 'P3', valor: p3Prom },
      ];
      const mejorEval = [...evals].sort((a, b) => b.valor - a.valor)[0];
      const peorEval = [...evals].sort((a, b) => a.valor - b.valor)[0];
      if (mejorEval.valor - peorEval.valor > 2) {
        fortalezas.push(`Rindes mejor en ${mejorEval.nombre} (${mejorEval.valor.toFixed(1)} pts promedio) que en ${peorEval.nombre} (${peorEval.valor.toFixed(1)} pts). Tu desempeño no es uniforme entre evaluaciones — identifica qué cambió.`);
      }

      // 8. Regularidad (varianza)
      if (materiasEntries.length > 1) {
        if (desviacion > escala * 0.15) {
          debilidades.push(`Perfil irregular: tus notas por materia oscilan con una desviación de ${desviacion.toFixed(1)} pts. Un perfil así (muy bueno en X, muy flojo en Y) es más riesgoso que un rendimiento parejo.`);
        } else if (desviacion < escala * 0.05 && promedioGeneral > umbralRegular) {
          fortalezas.push(`Perfil homogéneo: todas tus materias rondan los ${promedioGeneral.toFixed(1)} pts (desviación ${desviacion.toFixed(1)}). No tienes puntos críticos, tu rendimiento es parejo.`);
        }
      }

      // Si quedó vacío, agregar algo genérico
      if (fortalezas.length === 0) fortalezas.push(`Tu promedio general es ${promedioGeneral.toFixed(1)} pts. No hay materias destacadas por encima del curso, pero tampoco estás por debajo en ninguna.`);
      if (debilidades.length === 0) debilidades.push(`No se detectan debilidades críticas. Tu rendimiento en ${materiasEntries.length} materias es consistente con el promedio del curso.`);

      // ============================================================
      // CONSECUENCIAS DINÁMICAS
      // ============================================================
      if (promedioGeneral >= umbralAprobado && diffConCurso >= 0) {
        consecuencias = `Con ${promedioGeneral.toFixed(1)} pts en ${materiasEntries.length} materias, estás en zona de aprobación con margen sobre el promedio del curso. Riesgo de reprobación bajo. Puedes aspirar a pasantías técnicas, proyectos de investigación y titulación sin contratiempos. Prioriza mantener el ritmo y no descuidar ${peor ? peor[0] : 'ninguna materia'} (tu punto más flojo).`;
      } else if (promedioGeneral >= umbralAprobado && diffConCurso < 0) {
        consecuencias = `Apruebas con ${promedioGeneral.toFixed(1)} pts, pero estás por debajo del promedio del curso (${promedioCursoGlobal.toFixed(1)}). Aprobado sí, pero sin margen para materias avanzadas de arquitectura de software que exigen bases más sólidas. Aprovecha ${mejor ? mejor[0] : 'tu mejor materia'} para reforzar las demás.`;
      } else if (promedioGeneral >= umbralRegular) {
        consecuencias = `Con ${promedioGeneral.toFixed(1)} pts estás en zona regular. Riesgo moderado de rezago al enfrentar asignaturas avanzadas si no consolidas la constancia. Necesitas subir ${(umbralAprobado - promedioGeneral).toFixed(1)} pts para entrar en zona cómoda. Ataca primero ${peor ? peor[0] : 'tu materia más débil'}.`;
      } else {
        consecuencias = `Con ${promedioGeneral.toFixed(1)} pts estás en zona de riesgo crítico. Peligro inminente de reprobación de materias troncales y estancamiento semestral. Requieres intervención inmediata: tutoría focalizada en ${peor ? peor[0] : 'tu materia más débil'}, refuerzo de fundamentos algorítmicos y seguimiento pedagógico. Sin cambios en el próximo hito, el riesgo de perder materias es alto.`;
      }

      return {
        ...est,
        promedioGeneral,
        perfilGeneral: { fortalezas, debilidades, consecuencias },
      };
    });

    perfilesEstudiantes.sort((a: any, b: any) => b.promedioGeneral - a.promedioGeneral);

    return NextResponse.json({
      success: true,
      escala,
      datosMaterias,
      estadisticasMaterias,
      perfilesEstudiantes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
