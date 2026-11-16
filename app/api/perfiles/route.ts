import { NextResponse } from 'next/server';
import path from 'path';
import { google } from 'googleapis';
import { CATALOGO_REACTIVOS, buscarMateria, maximosDe } from '@/lib/catalogo-reactivos';
import { diagnosticarEstudiante, resumirCurso, type NotasMateria } from '@/lib/diagnostico';
import { leerHoja, type FilaCruda, type HojaLeida } from '@/lib/parser-libro';
import { leerLibroXlsx } from '@/lib/leer-xlsx';
import { UMBRAL_LOGRADO, nivelDeLogro } from '@/lib/escala';

const PESTANAS_IGNORADAS = [
  'resumen',
  'config',
  'configuracion',
  'inicio',
  'portada',
  'indice',
  'readme',
  'ayuda',
  'rubric',
  'rubrica',
  'students',
  'teachers',
  'radar',
];

function esPestanaMateria(titulo: string): boolean {
  const texto = titulo.trim().toLowerCase();
  if (!texto) return false;
  if (texto.startsWith('copy')) return false;
  return !PESTANAS_IGNORADAS.some((ignorada) => texto === ignorada || texto.startsWith(`${ignorada} `));
}

/** Acepta únicamente enlaces HTTPS de Google Sheets con identificador de documento. */
export function extraerIdHoja(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const limpia = url.trim();
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(limpia)) return null;
  const coincidencia = limpia.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return coincidencia ? coincidencia[1] : null;
}

function credencialesGoogle() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
      scopes,
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'keys.json'),
    scopes,
  });
}

interface HojaCruda {
  titulo: string;
  filas: FilaCruda[];
}

/** Hojas del libro publicado en Google Sheets. */
async function hojasDesdeGoogle(url: unknown): Promise<HojaCruda[]> {
  const spreadsheetId = extraerIdHoja(url);
  if (!spreadsheetId) {
    throw new Error('Enlace no válido: se esperaba https://docs.google.com/spreadsheets/d/<id>.');
  }

  const auth = credencialesGoogle();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const hojas = spreadsheet.data.sheets || [];
  const resultado: HojaCruda[] = [];

  for (const hoja of hojas) {
    const titulo = hoja.properties?.title || '';
    if (!esPestanaMateria(titulo)) continue;
    const respuesta = await sheets.spreadsheets.values.get({ spreadsheetId, range: titulo });
    resultado.push({ titulo, filas: (respuesta.data.values || []) as FilaCruda[] });
  }

  return resultado;
}

/** Hojas de un archivo .xlsx subido desde el navegador. */
async function hojasDesdeArchivo(archivo: unknown): Promise<HojaCruda[]> {
  const candidato = archivo as { arrayBuffer?: () => Promise<ArrayBuffer>; name?: string } | null;
  if (!candidato || typeof candidato.arrayBuffer !== 'function') {
    throw new Error('No se recibió un archivo válido.');
  }
  const buffer = Buffer.from(await candidato.arrayBuffer());
  if (buffer.length === 0) throw new Error('El archivo está vacío.');
  if (buffer.length > 25 * 1024 * 1024) throw new Error('El archivo supera los 25 MB.');

  return leerLibroXlsx(buffer).map((hoja) => ({ titulo: hoja.titulo, filas: hoja.filas as FilaCruda[] }));
}

interface FilaRespuesta {
  Nombre: string;
  Correo: string;
  P1: number | null;
  P2: number | null;
  P3: number | null;
  Global: number | null;
  Promedio: number;
  completo: boolean;
}

function porcentaje(valor: number | null, maximo: number | undefined): number | null {
  if (valor === null || valor === undefined || !maximo) return null;
  return Number(((valor / maximo) * 100).toFixed(2));
}

function estadisticasDeFilas(filas: FilaRespuesta[]) {
  let suma = 0;
  let aprobados = 0;
  let regulares = 0;
  let enRiesgo = 0;
  for (const fila of filas) {
    suma += fila.Promedio;
    if (fila.Promedio >= UMBRAL_LOGRADO) aprobados++;
    else if (fila.Promedio >= 31) regulares++;
    else enRiesgo++;
  }
  const total = filas.length;
  return {
    total,
    promedioGeneral: total > 0 ? Number((suma / total).toFixed(2)) : 0,
    aprobados,
    regulares,
    enRiesgo,
    porcentajeAprobados: total > 0 ? Number(((aprobados / total) * 100).toFixed(1)) : 0,
    porcentajeRegulares: total > 0 ? Number(((regulares / total) * 100).toFixed(1)) : 0,
    porcentajeRiesgo: total > 0 ? Number(((enRiesgo / total) * 100).toFixed(1)) : 0,
  };
}

function construirConsecuencias(promedio: number, peorMateria: string | null): string {
  const nivel = nivelDeLogro(promedio);
  if (promedio >= 71) {
    return `El perfil alcanza ${promedio.toFixed(1).replace('.', ',')} % de dominio global (${nivel.etiqueta}). Conviene sostener la práctica para no descender en el siguiente hito.`;
  }
  if (promedio >= UMBRAL_LOGRADO) {
    return `El perfil alcanza ${promedio.toFixed(1).replace('.', ',')} % de dominio global (${nivel.etiqueta}), el umbral institucional esperado. El margen es estrecho: un descuido en ${peorMateria ?? 'la asignatura más débil'} puede llevar el promedio por debajo de 51 %.`;
  }
  if (promedio >= 31) {
    return `El perfil alcanza ${promedio.toFixed(1).replace('.', ',')} % de dominio global (${nivel.etiqueta}) y todavía no llega al umbral Logrado (51 %). Falta consolidar ${peorMateria ?? 'las competencias más débiles'}.`;
  }
  return `El perfil alcanza ${promedio.toFixed(1).replace('.', ',')} % de dominio global (${nivel.etiqueta}). Requiere acompañamiento focalizado en ${peorMateria ?? 'las competencias no evidenciadas'}.`;
}

/** Procesa las hojas (vengan de Google o de un .xlsx) y arma la respuesta completa. */
function procesarHojas(hojasCrudas: HojaCruda[]) {
  const hojasLeidas: HojaLeida[] = [];
  const advertencias: string[] = [];

  for (const hoja of hojasCrudas) {
    if (!esPestanaMateria(hoja.titulo)) {
      advertencias.push(`Pestaña omitida: «${hoja.titulo}» (configuración o sin formato de materia).`);
      continue;
    }
    const leida = leerHoja(hoja.filas, { materia: hoja.titulo });
    hojasLeidas.push(leida);
    for (const aviso of leida.advertencias) advertencias.push(aviso);
  }

  const datosMaterias: Record<string, FilaRespuesta[]> = {};
  const maximosPorMateria: Record<string, Record<string, number>> = {};
  const estadisticasMaterias: Record<string, ReturnType<typeof estadisticasDeFilas>> = {};
  const catalogadas: Record<string, boolean> = {};
  const porEstudiante = new Map<
    string,
    { correo: string; materias: Array<{ nombre: string; datos: NotasMateria }> }
  >();

  for (const hoja of hojasLeidas) {
    if (hoja.registros.length === 0) continue;
    const maxima = hoja.maxima;
    const materia = hoja.materia || hoja.clave;
    maximosPorMateria[materia] = maxima;
    catalogadas[materia] = hoja.catalogada;

    const filas: FilaRespuesta[] = hoja.registros.map((registro) => ({
      Nombre: registro.nombre,
      Correo: registro.correo,
      P1: porcentaje(registro.puntos.P1 ?? null, maxima.P1),
      P2: porcentaje(registro.puntos.P2 ?? null, maxima.P2),
      P3: porcentaje(registro.puntos.P3 ?? null, maxima.P3),
      Global: porcentaje(registro.puntos.GLOBAL ?? null, maxima.GLOBAL),
      Promedio: registro.promedio,
      completo: registro.completo,
    }));

    datosMaterias[materia] = filas;
    estadisticasMaterias[materia] = estadisticasDeFilas(filas);

    for (const registro of hoja.registros) {
      if (!porEstudiante.has(registro.nombre)) {
        porEstudiante.set(registro.nombre, { correo: registro.correo, materias: [] });
      }
      porEstudiante.get(registro.nombre)!.materias.push({
        nombre: materia,
        datos: { materia, puntos: registro.puntos, reactivos: registro.reactivos },
      });
    }
  }

  const buscar = (nombre: string) => buscarMateria(nombre);
  const diagnosticos = Array.from(porEstudiante.entries()).map(([nombre, registro]) =>
    diagnosticarEstudiante(
      nombre,
      registro.materias.map((materia) => materia.datos),
      buscar,
    ),
  );

  const perfilesEstudiantes = diagnosticos.map((diagnostico) => {
    const materias = Object.fromEntries(
      diagnostico.materias.map((materia) => [
        materia.materia,
        {
          p1: materia.dimensiones.find((d) => d.id === 'P1')?.pct ?? null,
          p2: materia.dimensiones.find((d) => d.id === 'P2')?.pct ?? null,
          p3: materia.dimensiones.find((d) => d.id === 'P3')?.pct ?? null,
          global: materia.dimensiones.find((d) => d.id === 'GLOBAL')?.pct ?? null,
          promedio: materia.pctGlobal,
        },
      ]),
    );

    const ordenadas = [...diagnostico.materias].sort((a, b) => b.pctGlobal - a.pctGlobal);
    const mejor = ordenadas[0];
    const peor = ordenadas[ordenadas.length - 1];

    const fortalezas: string[] = [];
    const debilidades: string[] = [];

    if (mejor) {
      fortalezas.push(
        `Mejor asignatura: ${mejor.materia} con ${mejor.pctGlobal.toFixed(1).replace('.', ',')} % de dominio (${mejor.nivelGlobal.etiqueta}).`,
      );
    }
    for (const fortaleza of diagnostico.fortalezas.slice(0, 3)) fortalezas.push(fortaleza);
    for (const brecha of diagnostico.brechas.slice(0, 3)) {
      debilidades.push(`${brecha.nombre} en ${brecha.materia} (${brecha.puntosEnRiesgo} pts en riesgo).`);
    }
    if (peor && ordenadas.length > 1) {
      debilidades.push(
        `Asignatura más débil: ${peor.materia} con ${peor.pctGlobal.toFixed(1).replace('.', ',')} %.`,
      );
    }
    if (fortalezas.length === 0) fortalezas.push('Sin fortalezas destacadas con los datos disponibles.');
    if (debilidades.length === 0) debilidades.push('Sin brechas por debajo del nivel Logrado.');

    return {
      nombre: diagnostico.nombre,
      correo: porEstudiante.get(diagnostico.nombre)?.correo ?? '',
      promedioGeneral: diagnostico.pctGlobal,
      materias,
      perfilGeneral: {
        fortalezas,
        debilidades,
        consecuencias: construirConsecuencias(diagnostico.pctGlobal, peor?.materia ?? null),
      },
    };
  });

  perfilesEstudiantes.sort((a, b) => b.promedioGeneral - a.promedioGeneral);

  return {
    success: true,
    escala: 100,
    datosMaterias,
    estadisticasMaterias,
    maximosPorMateria,
    catalogadas,
    perfilesEstudiantes,
    diagnosticos: diagnosticos.sort((a, b) => a.pctGlobal - b.pctGlobal),
    resumenCurso: resumirCurso(diagnosticos),
    catalogo: CATALOGO_REACTIVOS.map((materia) => ({
      nombre: materia.nombre,
      hito: materia.hito,
      instrumento: materia.instrumento,
      maxima: maximosDe(materia),
      reactivos: materia.dimensiones.reduce((suma, dimension) => suma + dimension.reactivos.length, 0),
    })),
    hojasProcesadas: hojasLeidas.map((hoja) => ({
      materia: hoja.materia,
      registros: hoja.registros.length,
      catalogada: hoja.catalogada,
      maxima: hoja.maxima,
    })),
    advertencias: Array.from(new Set(advertencias)),
  };
}

export async function POST(request: Request) {
  try {
    const tipo = request.headers.get('content-type') || '';
    let hojasCrudas: HojaCruda[];
    let origen: 'google' | 'archivo';

    if (tipo.includes('multipart/form-data')) {
      const formulario = await request.formData();
      hojasCrudas = await hojasDesdeArchivo(formulario.get('archivo'));
      origen = 'archivo';
    } else {
      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo || typeof cuerpo !== 'object') {
        return NextResponse.json({ success: false, error: 'Cuerpo de la solicitud no válido.' }, { status: 400 });
      }
      hojasCrudas = await hojasDesdeGoogle((cuerpo as { url?: string }).url);
      origen = 'google';
    }

    const resultado = procesarHojas(hojasCrudas);

    if (resultado.hojasProcesadas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se encontró ninguna pestaña con calificaciones. Revisa que el libro tenga una pestaña por asignatura con encabezados de nombre y de evaluación (P1, P2, P3 o Sección).',
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ...resultado, origen });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en la ingesta:', mensaje);

    const esEnlace = /Enlace no válido/.test(mensaje);
    const esGoogle = /Google Sheets API|API has not been used|PERMISSION_DENIED|401|403/.test(mensaje);

    const pista = esGoogle
      ? ' La cuenta de servicio no tiene la API de Google Sheets habilitada o el libro no está compartido con ella. Mientras lo resuelves, sube el archivo .xlsx directamente.'
      : '';

    return NextResponse.json(
      { success: false, error: `${esEnlace ? mensaje : 'No se pudo procesar el libro de calificaciones.'}${pista}` },
      { status: esEnlace ? 400 : 500 },
    );
  }
}
