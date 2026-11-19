import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'path';
import { google } from 'googleapis';
import { CATALOGO_REACTIVOS, buscarMateria, maximosDe } from '@/lib/catalogo-reactivos';
import { diagnosticarEstudiante, resumirCurso, type NotasMateria } from '@/lib/diagnostico';
import { leerHoja, type FilaCruda, type HojaLeida } from '@/lib/parser-libro';
import { leerLibroXlsx } from '@/lib/leer-xlsx';
import { clasificarErrorGoogle, urlExportacion } from '@/lib/google-errores';
import { UMBRAL_LOGRADO, nivelDeLogro } from '@/lib/escala';
import { leerConsolidado, unirConsolidados, type FilaConsolidadoLeida } from '@/lib/consolidado';
import { normalizarTexto } from '@/lib/texto';

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

/**
 * Cliente JWT explícito a partir de una cuenta de servicio validada.
 * Reemplaza `keyFile`, que google-auth-library marca como obsoleto.
 */
function credencialesGoogle() {
  const bruto = process.env.GOOGLE_CREDENTIALS_JSON ?? fs.readFileSync(path.join(process.cwd(), 'keys.json'), 'utf8');
  const cred = JSON.parse(bruto) as { type?: string; client_email?: string; private_key?: string };
  if (cred.type !== 'service_account' || !cred.client_email || !cred.private_key) {
    throw new Error('Las credenciales deben ser de una cuenta de servicio (type: service_account).');
  }
  return new google.auth.JWT({
    email: cred.client_email,
    key: cred.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

interface HojaCruda {
  titulo: string;
  filas: FilaCruda[];
}

/** Hojas del libro publicado en Google Sheets. */
async function hojasDesdeGoogle(url: unknown): Promise<{ hojas: HojaCruda[]; origen: string; avisos: string[] }> {
  const spreadsheetId = extraerIdHoja(url);
  if (!spreadsheetId) {
    throw new Error('Enlace no válido: se esperaba https://docs.google.com/spreadsheets/d/<id>.');
  }

  const avisos: string[] = [];
  const hayCredenciales = !!process.env.GOOGLE_CREDENTIALS_JSON || fs.existsSync(path.join(process.cwd(), 'keys.json'));

  if (hayCredenciales) {
    try {
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

      return { hojas: resultado, origen: 'cuenta-de-servicio', avisos };
    } catch (error) {
      const diagnostico = clasificarErrorGoogle(error instanceof Error ? error.message : String(error));
      avisos.push(`${diagnostico.titulo}. ${diagnostico.instruccion}`);
      // Si la cuenta de servicio no puede leerlo, se intenta la exportación pública.
    }
  } else {
    avisos.push(
      'No hay credenciales de Google configuradas: se intentó leer el libro por exportación pública.',
    );
  }

  const respuesta = await fetch(urlExportacion(spreadsheetId), { redirect: 'follow', cache: 'no-store' });
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo descargar el libro (HTTP ${respuesta.status}). Compártelo como «cualquiera con el enlace» o sube el archivo .xlsx.`,
    );
  }

  const tipo = respuesta.headers.get('content-type') || '';
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  if (tipo.includes('text/html') || buffer.subarray(0, 2).toString() !== 'PK') {
    throw new Error(
      'El libro no es público: Google devolvió la página de inicio de sesión. Compártelo como «cualquiera con el enlace» o sube el archivo .xlsx.',
    );
  }

  const hojas = leerLibroXlsx(buffer).map((hoja) => ({
    titulo: hoja.titulo,
    filas: hoja.filas as FilaCruda[],
  }));

  avisos.push('El libro se leyó por exportación pública: conviene compartirlo con la cuenta de servicio para no depender del enlace abierto.');
  return { hojas, origen: 'exportacion-publica', avisos };
}

/** Hojas de un archivo .xlsx subido desde el navegador. */
async function hojasDesdeArchivos(archivos: unknown[]): Promise<HojaCruda[]> {
  if (archivos.length === 0) throw new Error('No se recibió ningún archivo.');
  const todas: HojaCruda[] = [];
  for (const archivo of archivos) todas.push(...(await hojasDesdeArchivo(archivo)));
  return todas;
}

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

interface PerfilSalida {
  nombre: string;
  correo: string;
  promedioGeneral: number;
  materias: Record<string, { p1: number | null; p2: number | null; p3: number | null; global: number | null; promedio: number }>;
  perfilGeneral: { fortalezas: string[]; debilidades: string[]; consecuencias: string };
  /** Figura en la lista pero no tiene ninguna nota: no se presentó al examen. */
  noSePresento?: boolean;
}

const NO_SE_PRESENTO = 'No se presentó al examen del hito: no tiene notas registradas en ninguna asignatura.';

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
  const consolidados: FilaConsolidadoLeida[][] = [];

  for (const hoja of hojasCrudas) {
    // Libro «Calificaciones por materia»: una columna por asignatura.
    if (!buscarMateria(hoja.titulo)) {
      const consolidado = leerConsolidado(hoja.filas);
      if (consolidado) {
        consolidados.push(consolidado);
        continue;
      }
    }
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

  const perfilesEstudiantes: PerfilSalida[] = diagnosticos.map((diagnostico) => {
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

  // Nadie queda fuera: quien figura en la lista sin notas aparece como «no se presentó».
  const consolidado = unirConsolidados(consolidados);
  const noPresentados: Record<string, Array<{ Nombre: string; Correo: string }>> = {};
  const soloPorMateria = hojasLeidas.every((h) => h.registros.length === 0) && consolidado.length > 0;

  if (!soloPorMateria) {
    for (const hoja of hojasLeidas) {
      if (hoja.sinNota.length === 0) continue;
      noPresentados[hoja.materia] = hoja.sinNota.map((x) => ({ Nombre: x.nombre, Correo: x.correo }));
    }
    const conNota = new Set(perfilesEstudiantes.map((p) => normalizarTexto(p.nombre)));
    for (const hoja of hojasLeidas) {
      for (const x of hoja.sinNota) {
        const clave = normalizarTexto(x.nombre);
        if (conNota.has(clave)) continue;
        conNota.add(clave);
        perfilesEstudiantes.push({
          nombre: x.nombre,
          correo: x.correo,
          promedioGeneral: 0,
          materias: {},
          noSePresento: true,
          perfilGeneral: { fortalezas: [], debilidades: [], consecuencias: NO_SE_PRESENTO },
        });
      }
    }
  } else {
    // Solo el libro «por materia»: una nota por asignatura, sin P1, P2 ni P3.
    const nombresMateria = Array.from(new Set(consolidado.flatMap((f) => Object.keys(f.valores)))).filter(
      (m) => !normalizarTexto(m).includes('habilidades blandas'),
    );
    for (const materia of nombresMateria) {
      const filas: FilaRespuesta[] = [];
      for (const f of consolidado) {
        const v = f.valores[materia];
        if (v === null || v === undefined) {
          (noPresentados[materia] ??= []).push({ Nombre: f.nombre, Correo: f.correo });
          continue;
        }
        filas.push({ Nombre: f.nombre, Correo: f.correo, P1: null, P2: null, P3: null, Global: null, Promedio: v, completo: true });
      }
      if (filas.length === 0) continue;
      datosMaterias[materia] = filas;
      estadisticasMaterias[materia] = estadisticasDeFilas(filas);
    }
    for (const f of consolidado) {
      const notas = nombresMateria.map((m) => [m, f.valores[m]] as const).filter((x): x is readonly [string, number] => x[1] !== null && x[1] !== undefined);
      if (notas.length === 0) {
        perfilesEstudiantes.push({ nombre: f.nombre, correo: f.correo, promedioGeneral: 0, materias: {}, noSePresento: true, perfilGeneral: { fortalezas: [], debilidades: [], consecuencias: NO_SE_PRESENTO } });
        continue;
      }
      const promedio = Math.round((notas.reduce((a, x) => a + x[1], 0) / notas.length) * 100) / 100;
      const orden = [...notas].sort((a, b) => b[1] - a[1]);
      perfilesEstudiantes.push({
        nombre: f.nombre,
        correo: f.correo,
        promedioGeneral: promedio,
        materias: Object.fromEntries(notas.map(([m, v]) => [m, { p1: null, p2: null, p3: null, global: null, promedio: v }])),
        perfilGeneral: {
          fortalezas: [`Mejor asignatura: ${orden[0][0]} con ${orden[0][1]} %.`],
          debilidades: orden.length > 1 ? [`Asignatura más débil: ${orden[orden.length - 1][0]} con ${orden[orden.length - 1][1]} %.`] : [],
          consecuencias: construirConsecuencias(promedio, orden.length > 1 ? orden[orden.length - 1][0] : null),
        },
      });
    }
    advertencias.push('Solo se cargó el libro «por materia»: hay una nota por asignatura, sin P1, P2 ni P3. Para el detalle por pregunta, sube también «Calificaciones por pregunta».');
  }

  perfilesEstudiantes.sort((a, b) => Number(!!a.noSePresento) - Number(!!b.noSePresento) || b.promedioGeneral - a.promedioGeneral);

  const registros = hojasLeidas.flatMap((hoja) =>
    hoja.registros.map((registro) => ({
      nombre: registro.nombre,
      correo: registro.correo,
      materia: hoja.materia || hoja.clave,
      puntos: registro.puntos,
      reactivos: registro.reactivos,
    })),
  );

  return {
    success: true,
    escala: 100,
    registros,
    consolidado,
    soloPorMateria,
    noPresentados,
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
    let origen: string;
    let avisosOrigen: string[] = [];

    let compacto = false;
    if (tipo.includes('multipart/form-data')) {
      const formulario = await request.formData();
      hojasCrudas = await hojasDesdeArchivos(formulario.getAll('archivo'));
      compacto = formulario.get('compacto') === '1';
      origen = 'archivo';
    } else {
      const cuerpo = await request.json().catch(() => null);
      compacto = !!(cuerpo as { compacto?: boolean } | null)?.compacto;
      if (!cuerpo || typeof cuerpo !== 'object') {
        return NextResponse.json({ success: false, error: 'Cuerpo de la solicitud no válido.' }, { status: 400 });
      }
      const lectura = await hojasDesdeGoogle((cuerpo as { url?: string }).url);
      hojasCrudas = lectura.hojas;
      origen = lectura.origen;
      avisosOrigen = lectura.avisos;
    }

    const resultado = procesarHojas(hojasCrudas);
    resultado.advertencias = [...avisosOrigen, ...resultado.advertencias];

    if (resultado.hojasProcesadas.length === 0 && resultado.consolidado.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se encontró ninguna pestaña con calificaciones. Revisa que el libro tenga una pestaña por asignatura con encabezados de nombre y de evaluación (P1, P2, P3 o Sección).',
        },
        { status: 422 },
      );
    }

    if (compacto) {
      // Entrada compacta: la interfaz recalcula el análisis y lo guarda por hito.
      return NextResponse.json({
        success: true,
        origen,
        registros: resultado.registros,
        consolidado: resultado.consolidado,
        hojasProcesadas: resultado.hojasProcesadas,
        advertencias: resultado.advertencias,
      });
    }
    return NextResponse.json({ ...resultado, origen });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en la ingesta:', mensaje);

    if (/Enlace no válido/.test(mensaje)) {
      return NextResponse.json({ success: false, error: mensaje }, { status: 400 });
    }

    // Los mensajes de esta ruta ya explican qué hacer; se devuelven tal cual.
    return NextResponse.json(
      {
        success: false,
        error: `${mensaje} También puedes subir el archivo .xlsx y analizarlo sin credenciales.`,
      },
      { status: 502 },
    );
  }
}
