/**
 * Análisis por hitos: estadística descriptiva, análisis de ítems (teoría clásica
 * de los tests), taxonomía de errores, perfil diagnóstico individual y
 * comparación entre hitos (Inicial → Intermedio → Final).
 *
 * Es un módulo puro (sin dependencias de React ni de Node) para que el mismo
 * cálculo se use en la interfaz, en los reportes descargables y en las pruebas.
 *
 * Principio metodológico heredado de `diagnostico.ts`: el sistema no inventa
 * precisión. El libro registra el puntaje por pregunta (P1, P2, P3); el tipo de
 * error se infiere de la banda de puntaje de cada pregunta y se declara como
 * inferencia, no como observación directa de la respuesta del estudiante.
 */

import { buscarMateria, type MateriaCatalogo } from './catalogo-reactivos';
import { diagnosticarEstudiante, type DiagnosticoEstudiante, type NotasMateria } from './diagnostico';
import { NIVELES_UAB, UMBRAL_LOGRADO, type NivelLogro } from './escala';
import { normalizarTexto } from './texto';

/* ------------------------------------------------------------------ */
/* Tipos de entrada                                                    */
/* ------------------------------------------------------------------ */

export const HITOS = ['Inicial', 'Intermedio', 'Final'] as const;
export type HitoId = (typeof HITOS)[number];

/** Calificaciones de un estudiante en una asignatura, tal como salen del libro. */
export interface RegistroNota {
  nombre: string;
  correo: string;
  materia: string;
  puntos: Record<string, number | null>;
  reactivos?: Record<string, number | null>;
}

/** Fila del libro «Calificaciones por materia» (consolidado institucional). */
export interface FilaConsolidado {
  nombre: string;
  correo: string;
  /** Porcentaje por asignatura (y «Habilidades blandas» si el libro la trae). */
  valores: Record<string, number | null>;
}

/** Lo que se guarda por hito: entradas compactas, el análisis se recalcula. */
export interface CargaHito {
  hito: HitoId;
  archivos: string[];
  cargadoEn: string;
  registros: RegistroNota[];
  consolidado: FilaConsolidado[];
  advertencias: string[];
}

/* ------------------------------------------------------------------ */
/* Estadística descriptiva                                             */
/* ------------------------------------------------------------------ */

export interface Estadisticos {
  n: number;
  media: number;
  mediana: number;
  de: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Cuantil con interpolación lineal (tipo 7, el de Excel CUARTIL.INC y R por defecto). */
export function cuantil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) return NaN;
  if (ordenados.length === 1) return ordenados[0];
  const h = (ordenados.length - 1) * p;
  const bajo = Math.floor(h);
  const alto = Math.ceil(h);
  return ordenados[bajo] + (h - bajo) * (ordenados[alto] - ordenados[bajo]);
}

export function estadisticos(valores: number[]): Estadisticos {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return { n: 0, media: NaN, mediana: NaN, de: NaN, q1: NaN, q3: NaN, min: NaN, max: NaN };
  const media = v.reduce((s, x) => s + x, 0) / n;
  const varianza = n > 1 ? v.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1) : 0;
  return {
    n,
    media: r2(media),
    mediana: r2(cuantil(v, 0.5)),
    de: r2(Math.sqrt(varianza)),
    q1: r2(cuantil(v, 0.25)),
    q3: r2(cuantil(v, 0.75)),
    min: v[0],
    max: v[n - 1],
  };
}

/** Cuartil de un valor dentro de su grupo: 1 = 25 % inferior, 4 = 25 % superior. */
export function cuartilDe(valor: number, e: Estadisticos): 1 | 2 | 3 | 4 {
  if (valor <= e.q1) return 1;
  if (valor <= e.mediana) return 2;
  if (valor <= e.q3) return 3;
  return 4;
}

/** Rango percentil: porcentaje del grupo por debajo (los empates cuentan la mitad). */
export function rangoPercentil(valor: number, grupo: number[]): number {
  if (grupo.length === 0) return NaN;
  const debajo = grupo.filter((x) => x < valor).length;
  const iguales = grupo.filter((x) => x === valor).length;
  return r1(((debajo + iguales / 2) / grupo.length) * 100);
}

/* ------------------------------------------------------------------ */
/* Taxonomía de errores                                                */
/* ------------------------------------------------------------------ */

export type TipoError = 'conceptual' | 'procedimental' | 'descuido';
export type EstadoPregunta = 'correcta' | 'con_perdidas' | 'no_lograda' | 'sin_nota';

export const TIPOS_ERROR: Record<TipoError, { etiqueta: string; descripcion: string }> = {
  conceptual: {
    etiqueta: 'Conceptual',
    descripcion:
      'Puntaje inferior al 31 %: no se evidencia comprensión del concepto que la pregunta evalúa (respuesta ausente o planteamiento incorrecto).',
  },
  procedimental: {
    etiqueta: 'Procedimental',
    descripcion:
      'Puntaje entre 31 % y 70 %: plantea el camino correcto, pero falla en pasos de ejecución, aplicación o justificación.',
  },
  descuido: {
    etiqueta: 'Descuido',
    descripcion:
      'Puntaje entre 71 % y 89 %: domina la pregunta y pierde puntos por imprecisiones menores (cálculo, sintaxis, verificación).',
  },
};

/** Banda de puntaje → estado de la pregunta y tipo de error inferido. */
export function clasificarPregunta(pct: number | null): { estado: EstadoPregunta; tipoError: TipoError | null } {
  if (pct === null || !Number.isFinite(pct)) return { estado: 'sin_nota', tipoError: null };
  if (pct >= 90) return { estado: 'correcta', tipoError: null };
  if (pct >= 71) return { estado: 'con_perdidas', tipoError: 'descuido' };
  if (pct >= UMBRAL_LOGRADO) return { estado: 'con_perdidas', tipoError: 'procedimental' };
  if (pct >= 31) return { estado: 'no_lograda', tipoError: 'procedimental' };
  return { estado: 'no_lograda', tipoError: 'conceptual' };
}

/* ------------------------------------------------------------------ */
/* Identidad y anonimización                                           */
/* ------------------------------------------------------------------ */

export function claveEstudiante(nombre: string): string {
  return normalizarTexto(nombre);
}

/** Código estable y no reversible (FNV-1a) para mostrar datos sin identificar a nadie. */
export function codigoAnonimo(clave: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < clave.length; i++) {
    h ^= clave.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `E-${((h >>> 0) % 46656).toString(36).toUpperCase().padStart(3, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Tipos de salida                                                     */
/* ------------------------------------------------------------------ */

export interface PreguntaPerfil {
  id: string;
  /** «P1», «P2», «P3» o «Única». */
  corta: string;
  etiqueta: string;
  max: number;
  valor: number | null;
  pct: number | null;
  nivel: NivelLogro | null;
  estado: EstadoPregunta;
  tipoError: TipoError | null;
  /** Competencias (reactivos del catálogo) que evalúa la pregunta. */
  competencias: string[];
  carencias: string[];
  acciones: string[];
  mediaCurso: number | null;
}

export interface MateriaPerfil {
  materia: string;
  catalogada: boolean;
  pct: number;
  nivel: NivelLogro;
  completo: boolean;
  cuartil: 1 | 2 | 3 | 4;
  percentil: number;
  mediaCurso: number;
  diferencia: number;
  preguntas: PreguntaPerfil[];
  preguntasNoLogradas: string[];
  fortalezas: string[];
  debilidades: string[];
}

export interface Recomendacion {
  materia: string;
  pregunta: string;
  accion: string;
  prioridad: 'alta' | 'media' | 'baja';
  puntosEnRiesgo: number;
}

export interface PerfilDiagnostico {
  clave: string;
  codigo: string;
  nombre: string;
  correo: string;
  pctGlobal: number;
  nivel: NivelLogro;
  posicion: number;
  cuartilGlobal: 1 | 2 | 3 | 4;
  percentilGlobal: number;
  riesgo: { nivel: 'alto' | 'medio' | 'bajo'; motivos: string[] };
  materias: MateriaPerfil[];
  fortalezas: string[];
  debilidades: string[];
  recomendaciones: Recomendacion[];
  erroresPorTipo: Record<TipoError, number>;
  /** Variación media P1 → P3 dentro del hito (puntos porcentuales). */
  progresoInterno: number | null;
  habilidadesBlandas: number | null;
  sintesis: string;
}

export interface AnalisisPregunta {
  id: string;
  corta: string;
  etiqueta: string;
  max: number;
  n: number;
  estadisticos: Estadisticos;
  /** Índice de dificultad (p): proporción media del puntaje obtenido (0–1). */
  dificultad: number;
  /** Índice de discriminación (D): p del 27 % superior − p del 27 % inferior. */
  discriminacion: number | null;
  pctNoLogrado: number;
  errores: Record<TipoError, number>;
  competencias: string[];
}

export interface ResumenMateria {
  materia: string;
  catalogada: boolean;
  instrumento: string | null;
  estadisticos: Estadisticos;
  distribucion: Record<string, number>;
  pctLogradoOMas: number;
  enRiesgo: number;
  preguntas: AnalisisPregunta[];
  /** Media de P1, P2 y P3 de la cohorte (evolución dentro del hito). */
  evolucionInterna: Array<{ corta: string; media: number }>;
}

export interface AnalisisHito {
  hito: HitoId;
  cargadoEn: string;
  archivos: string[];
  estudiantes: PerfilDiagnostico[];
  materias: ResumenMateria[];
  global: {
    n: number;
    estadisticos: Estadisticos;
    distribucion: Record<string, number>;
    riesgo: Record<'alto' | 'medio' | 'bajo', number>;
    errores: Record<TipoError, number>;
    progresoInterno: { mejoran: number; estables: number; retroceden: number; media: number | null; mediana: number | null };
    consistencia: { comparados: number; discrepancias: number } | null;
  };
  advertencias: string[];
}

/* ------------------------------------------------------------------ */
/* Construcción del análisis                                           */
/* ------------------------------------------------------------------ */

const ceroErrores = (): Record<TipoError, number> => ({ conceptual: 0, procedimental: 0, descuido: 0 });

function etiquetaCorta(id: string): string {
  return id === 'GLOBAL' ? 'Única' : id;
}

/** Nombre corto de la pregunta: «Pregunta 1 — Herencia y reutilización» → «Herencia y reutilización». */
function temaDe(etiqueta: string): string {
  const partes = etiqueta.split('—');
  return (partes[1] ?? partes[0]).trim();
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function listaHumana(items: string[], maximo = 5): string {
  if (items.length > maximo) return `${items.slice(0, maximo).join(', ')} y ${items.length - maximo} competencia(s) más`;
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function fmt(x: number | null | undefined, d = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return x.toFixed(d).replace('.', ',');
}

/** Agrupa los registros por estudiante y ejecuta el motor de diagnóstico. */
function diagnosticar(registros: RegistroNota[]) {
  const porClave = new Map<string, { nombre: string; correo: string; entradas: NotasMateria[] }>();
  for (const r of registros) {
    const clave = claveEstudiante(r.nombre);
    if (!clave) continue;
    if (!porClave.has(clave)) porClave.set(clave, { nombre: r.nombre, correo: r.correo, entradas: [] });
    const e = porClave.get(clave)!;
    if (!e.correo && r.correo) e.correo = r.correo;
    e.entradas.push({ materia: r.materia, puntos: r.puntos, reactivos: r.reactivos ?? {} });
  }
  const buscar = (m: string): MateriaCatalogo | null => buscarMateria(m);
  return Array.from(porClave.entries()).map(([clave, e]) => ({
    clave,
    nombre: e.nombre,
    correo: e.correo,
    diag: diagnosticarEstudiante(e.nombre, e.entradas, buscar),
  }));
}

/** Materias con al menos una nota (el resto no participa de la estadística). */
function materiasConNota(d: DiagnosticoEstudiante) {
  return d.materias.filter((m) => m.catalogada && m.promedio.maximoDisponible > 0);
}

export function analizarHito(carga: CargaHito): AnalisisHito {
  const advertencias = [...carga.advertencias];
  const diagnosticos = diagnosticar(carga.registros);

  /* ---- Agregados por asignatura y pregunta (cohorte) ---- */
  const porMateria = new Map<string, Array<{ clave: string; m: DiagnosticoEstudiante['materias'][number] }>>();
  for (const { clave, diag } of diagnosticos) {
    for (const m of materiasConNota(diag)) {
      const lista = porMateria.get(m.materia) ?? [];
      lista.push({ clave, m });
      porMateria.set(m.materia, lista);
    }
  }

  const resumenMaterias: ResumenMateria[] = [];
  const statsMateria = new Map<string, { e: Estadisticos; valores: number[] }>();
  const mediaPregunta = new Map<string, number>();

  for (const [materia, lista] of porMateria) {
    const valores = lista.map((x) => x.m.pctGlobal);
    const e = estadisticos(valores);
    statsMateria.set(materia, { e, valores });

    const distribucion: Record<string, number> = {};
    for (const nv of NIVELES_UAB) distribucion[nv.etiqueta] = 0;
    for (const x of lista) distribucion[x.m.nivelGlobal.etiqueta] += 1;

    const catalogo = buscarMateria(materia);
    const dimensiones = lista[0].m.dimensiones;

    // Grupos extremos (27 %) por puntaje total en la asignatura, para la discriminación.
    const ordenados = [...lista].sort((a, b) => b.m.pctGlobal - a.m.pctGlobal);
    const k = Math.max(1, Math.round(lista.length * 0.27));
    const superior = new Set(ordenados.slice(0, k).map((x) => x.clave));
    const inferior = new Set(ordenados.slice(-k).map((x) => x.clave));

    const preguntas: AnalisisPregunta[] = dimensiones.map((dim) => {
      const items = lista
        .map((x) => ({ clave: x.clave, d: x.m.dimensiones.find((dd) => dd.id === dim.id) }))
        .filter((x) => x.d && x.d.pct !== null) as Array<{ clave: string; d: { pct: number } }>;
      const pcts = items.map((x) => x.d.pct);
      const est = estadisticos(pcts);
      const errores = ceroErrores();
      let noLogrado = 0;
      for (const p of pcts) {
        const c = clasificarPregunta(p);
        if (c.tipoError) errores[c.tipoError] += 1;
        if (c.estado === 'no_lograda') noLogrado += 1;
      }
      const media = (claves: Set<string>) => {
        const sel = items.filter((x) => claves.has(x.clave)).map((x) => x.d.pct / 100);
        return sel.length ? sel.reduce((s, x) => s + x, 0) / sel.length : NaN;
      };
      const discr = dimensiones.length > 1 ? media(superior) - media(inferior) : null;
      mediaPregunta.set(`${materia}|${dim.id}`, est.media);
      const catDim = catalogo?.dimensiones.find((cd) => cd.id === dim.id);
      return {
        id: dim.id,
        corta: etiquetaCorta(dim.id),
        etiqueta: dim.etiqueta,
        max: dim.max,
        n: pcts.length,
        estadisticos: est,
        dificultad: r2(est.media / 100),
        discriminacion: discr === null || Number.isNaN(discr) ? null : r2(discr),
        pctNoLogrado: pcts.length ? r1((noLogrado / pcts.length) * 100) : 0,
        errores,
        competencias: catDim?.reactivos.map((r) => r.nombre) ?? [],
      };
    });

    resumenMaterias.push({
      materia,
      catalogada: !!catalogo,
      instrumento: catalogo?.instrumento ?? null,
      estadisticos: e,
      distribucion,
      pctLogradoOMas: r1((valores.filter((v) => v >= UMBRAL_LOGRADO).length / valores.length) * 100),
      enRiesgo: valores.filter((v) => v < 31).length,
      preguntas,
      evolucionInterna: preguntas
        .filter((p) => p.id !== 'GLOBAL')
        .map((p) => ({ corta: p.corta, media: p.estadisticos.media })),
    });
  }
  resumenMaterias.sort((a, b) => a.estadisticos.media - b.estadisticos.media);

  /* ---- Consolidado institucional (validación cruzada y habilidades blandas) ---- */
  const consolidado = new Map<string, FilaConsolidado>();
  for (const fila of carga.consolidado) consolidado.set(claveEstudiante(fila.nombre), fila);
  let comparados = 0;
  let discrepancias = 0;

  /* ---- Perfil individual ---- */
  const globales = diagnosticos.map((x) => x.diag.pctGlobal);
  const statsGlobal = estadisticos(globales);
  const ordenGlobal = [...diagnosticos].sort((a, b) => b.diag.pctGlobal - a.diag.pctGlobal);
  const posicion = new Map(ordenGlobal.map((x, i) => [x.clave, i + 1]));

  const estudiantes: PerfilDiagnostico[] = diagnosticos.map(({ clave, nombre, correo, diag }) => {
    const materias: MateriaPerfil[] = materiasConNota(diag).map((m) => {
      const st = statsMateria.get(m.materia)!;
      const catalogo = buscarMateria(m.materia);
      const preguntas: PreguntaPerfil[] = m.dimensiones.map((d) => {
        const c = clasificarPregunta(d.pct);
        const catDim = catalogo?.dimensiones.find((cd) => cd.id === d.id);
        return {
          id: d.id,
          corta: etiquetaCorta(d.id),
          etiqueta: d.etiqueta,
          max: d.max,
          valor: d.valor,
          pct: d.pct,
          nivel: d.nivel,
          estado: c.estado,
          tipoError: c.tipoError,
          competencias: catDim?.reactivos.map((r) => r.nombre) ?? [],
          carencias: catDim?.reactivos.map((r) => r.carencia) ?? [],
          acciones: Array.from(new Set(catDim?.reactivos.map((r) => r.accion) ?? [])),
          mediaCurso: mediaPregunta.get(`${m.materia}|${d.id}`) ?? null,
        };
      });

      const fortalezas: string[] = [];
      const debilidades: string[] = [];
      for (const p of preguntas) {
        if (p.pct === null) continue;
        if (p.pct >= 71) {
          fortalezas.push(
            `${p.corta} · ${temaDe(p.etiqueta)} (${fmt(p.pct)} %): demuestra ${listaHumana(p.competencias.map(minusculaInicial))}.`,
          );
        } else if (p.pct < UMBRAL_LOGRADO) {
          const tipo = p.tipoError ? TIPOS_ERROR[p.tipoError].etiqueta.toLowerCase() : 'sin clasificar';
          debilidades.push(
            `${p.corta} · ${temaDe(p.etiqueta)} (${fmt(p.pct)} %, error ${tipo}): no evidencia ${listaHumana(p.competencias.map(minusculaInicial))}.`,
          );
        }
      }

      return {
        materia: m.materia,
        catalogada: m.catalogada,
        pct: m.pctGlobal,
        nivel: m.nivelGlobal,
        completo: m.promedio.completo,
        cuartil: cuartilDe(m.pctGlobal, st.e),
        percentil: rangoPercentil(m.pctGlobal, st.valores),
        mediaCurso: st.e.media,
        diferencia: r1(m.pctGlobal - st.e.media),
        preguntas,
        preguntasNoLogradas: preguntas.filter((p) => p.estado === 'no_lograda').map((p) => p.corta),
        fortalezas,
        debilidades,
      };
    });

    // Fortalezas y debilidades específicas, ordenadas por magnitud.
    const fortalezas = materias
      .flatMap((m) => m.preguntas.filter((p) => p.pct !== null && p.pct >= 71).map((p) => ({ m, p })))
      .sort((a, b) => (b.p.pct ?? 0) - (a.p.pct ?? 0))
      .map(
        ({ m, p }) =>
          `${m.materia} — ${temaDe(p.etiqueta)} (${p.corta}, ${fmt(p.pct)} %): demuestra ${listaHumana(p.competencias.map(minusculaInicial))}.`,
      );

    const noLogradas = materias
      .flatMap((m) => m.preguntas.filter((p) => p.estado === 'no_lograda').map((p) => ({ m, p })))
      .sort((a, b) => b.p.max * (1 - (b.p.pct ?? 0) / 100) - a.p.max * (1 - (a.p.pct ?? 0) / 100));

    const debilidades = materias
      .filter((m) => m.preguntasNoLogradas.length > 0)
      .map((m) => {
        const ps = m.preguntas.filter((p) => p.estado === 'no_lograda');
        return `${m.materia}: dificultad en ${ps.map((p) => `${temaDe(p.etiqueta)} (${p.corta}, ${fmt(p.pct)} %)`).join('; ')}.`;
      });

    const recomendaciones: Recomendacion[] = [];
    const vistas = new Set<string>();
    for (const { m, p } of noLogradas) {
      const enRiesgo = r1(p.max * (1 - (p.pct ?? 0) / 100));
      // Hasta dos acciones por pregunta, para que una pregunta con muchos ítems no acapare el plan.
      for (const accion of p.acciones.filter((a) => !vistas.has(a)).slice(0, 2)) {
        vistas.add(accion);
        recomendaciones.push({
          materia: m.materia,
          pregunta: `${p.corta} · ${temaDe(p.etiqueta)}`,
          accion,
          prioridad: (p.pct ?? 0) < 31 ? 'alta' : 'media',
          puntosEnRiesgo: enRiesgo,
        });
      }
    }
    for (const m of materias) {
      for (const p of m.preguntas.filter((pp) => pp.tipoError === 'descuido')) {
        const accion = `Revisar «${temaDe(p.etiqueta)}» con una lista de verificación final: el dominio está presente y los puntos se pierden por imprecisiones.`;
        if (vistas.has(accion)) continue;
        vistas.add(accion);
        recomendaciones.push({
          materia: m.materia,
          pregunta: `${p.corta} · ${temaDe(p.etiqueta)}`,
          accion,
          prioridad: 'baja',
          puntosEnRiesgo: r1(p.max * (1 - (p.pct ?? 0) / 100)),
        });
      }
    }

    const erroresPorTipo = ceroErrores();
    for (const m of materias) for (const p of m.preguntas) if (p.tipoError) erroresPorTipo[p.tipoError] += 1;

    const enInicio = materias.filter((m) => m.pct < 31).map((m) => m.materia);
    const motivos: string[] = [];
    if (diag.pctGlobal < 31) motivos.push(`Dominio global de ${fmt(diag.pctGlobal)} % (Inicio).`);
    else if (diag.pctGlobal < UMBRAL_LOGRADO) motivos.push(`Dominio global de ${fmt(diag.pctGlobal)} %, por debajo del umbral Logrado (51 %).`);
    if (enInicio.length >= 2) motivos.push(`${enInicio.length} asignaturas en nivel Inicio: ${enInicio.join(', ')}.`);
    const incompletas = materias.filter((m) => !m.completo).map((m) => m.materia);
    if (incompletas.length) motivos.push(`Evaluaciones sin nota en ${incompletas.join(', ')}.`);
    const riesgoNivel: 'alto' | 'medio' | 'bajo' =
      diag.pctGlobal < 31 || enInicio.length >= 3 ? 'alto' : diag.pctGlobal < UMBRAL_LOGRADO || enInicio.length >= 2 ? 'medio' : 'bajo';

    // Progreso dentro del hito: P3 − P1 promediado entre asignaturas con ambas notas.
    const deltas = materias
      .map((m) => {
        const p1 = m.preguntas.find((p) => p.id === 'P1')?.pct;
        const p3 = m.preguntas.find((p) => p.id === 'P3')?.pct;
        return p1 !== null && p1 !== undefined && p3 !== null && p3 !== undefined ? p3 - p1 : null;
      })
      .filter((x): x is number => x !== null);
    const progresoInterno = deltas.length ? r2(deltas.reduce((s, x) => s + x, 0) / deltas.length) : null;

    const cons = consolidado.get(clave);
    let habilidadesBlandas: number | null = null;
    if (cons) {
      for (const [nombreCol, valor] of Object.entries(cons.valores)) {
        if (valor === null) continue;
        if (normalizarTexto(nombreCol).includes('habilidades blandas')) {
          habilidadesBlandas = valor;
          continue;
        }
        const propia = materias.find((m) => buscarMateria(m.materia) && buscarMateria(m.materia) === buscarMateria(nombreCol));
        if (propia) {
          comparados += 1;
          if (Math.abs(propia.pct - valor) > 1) discrepancias += 1;
        }
      }
    }

    const mejor = [...materias].sort((a, b) => b.pct - a.pct)[0];
    const peor = [...materias].sort((a, b) => a.pct - b.pct)[0];
    const sintesis = [
      `Dominio global de ${fmt(diag.pctGlobal)} % (${diag.nivelGlobal.etiqueta}), posición ${posicion.get(clave)} de ${diagnosticos.length}.`,
      mejor ? `Su asignatura más sólida es ${mejor.materia} (${fmt(mejor.pct)} %, cuartil ${mejor.cuartil}).` : '',
      peor && peor !== mejor ? `La que requiere más atención es ${peor.materia} (${fmt(peor.pct)} %, cuartil ${peor.cuartil}).` : '',
      noLogradas.length
        ? `Tiene ${noLogradas.length} pregunta(s) no lograda(s); predominan los errores de tipo ${dominante(erroresPorTipo)}.`
        : 'No registra preguntas por debajo del nivel Logrado.',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      clave,
      codigo: codigoAnonimo(clave),
      nombre,
      correo,
      pctGlobal: diag.pctGlobal,
      nivel: diag.nivelGlobal,
      posicion: posicion.get(clave)!,
      cuartilGlobal: cuartilDe(diag.pctGlobal, statsGlobal),
      percentilGlobal: rangoPercentil(diag.pctGlobal, globales),
      riesgo: { nivel: riesgoNivel, motivos },
      materias,
      fortalezas,
      debilidades,
      recomendaciones: recomendaciones.sort((a, b) => ordenPrioridad(a) - ordenPrioridad(b) || b.puntosEnRiesgo - a.puntosEnRiesgo),
      erroresPorTipo,
      progresoInterno,
      habilidadesBlandas,
      sintesis,
    };
  });

  // Códigos únicos aunque el hash coincida.
  const usados = new Map<string, number>();
  for (const e of estudiantes) {
    const veces = usados.get(e.codigo) ?? 0;
    usados.set(e.codigo, veces + 1);
    if (veces > 0) e.codigo = `${e.codigo}${veces}`;
  }

  estudiantes.sort((a, b) => a.posicion - b.posicion);

  const distribucion: Record<string, number> = {};
  for (const nv of NIVELES_UAB) distribucion[nv.etiqueta] = 0;
  const riesgo = { alto: 0, medio: 0, bajo: 0 };
  const errores = ceroErrores();
  for (const e of estudiantes) {
    distribucion[e.nivel.etiqueta] += 1;
    riesgo[e.riesgo.nivel] += 1;
    for (const t of Object.keys(errores) as TipoError[]) errores[t] += e.erroresPorTipo[t];
  }
  const progresos = estudiantes.map((e) => e.progresoInterno).filter((x): x is number => x !== null);
  const estProg = estadisticos(progresos);

  if (carga.consolidado.length > 0 && discrepancias > 0) {
    advertencias.push(
      `Validación cruzada: ${discrepancias} de ${comparados} notas por asignatura difieren en más de 1 punto entre el libro por pregunta y el consolidado por materia.`,
    );
  }

  return {
    hito: carga.hito,
    cargadoEn: carga.cargadoEn,
    archivos: carga.archivos,
    estudiantes,
    materias: resumenMaterias,
    global: {
      n: estudiantes.length,
      estadisticos: statsGlobal,
      distribucion,
      riesgo,
      errores,
      progresoInterno: {
        mejoran: progresos.filter((x) => x > 2).length,
        estables: progresos.filter((x) => x >= -2 && x <= 2).length,
        retroceden: progresos.filter((x) => x < -2).length,
        media: progresos.length ? estProg.media : null,
        mediana: progresos.length ? estProg.mediana : null,
      },
      consistencia: carga.consolidado.length > 0 ? { comparados, discrepancias } : null,
    },
    advertencias: Array.from(new Set(advertencias)),
  };
}

function dominante(e: Record<TipoError, number>): string {
  const [tipo] = (Object.entries(e) as Array<[TipoError, number]>).sort((a, b) => b[1] - a[1])[0];
  return TIPOS_ERROR[tipo].etiqueta.toLowerCase();
}

function ordenPrioridad(r: Recomendacion): number {
  return r.prioridad === 'alta' ? 0 : r.prioridad === 'media' ? 1 : 2;
}

/* ------------------------------------------------------------------ */
/* Comparación entre hitos                                             */
/* ------------------------------------------------------------------ */

export type Tendencia = 'mejora' | 'estable' | 'retroceso';

export interface ProgresoEstudiante {
  clave: string;
  codigo: string;
  nombre: string;
  puntos: Array<{ hito: HitoId; pct: number | null }>;
  delta: number | null;
  tendencia: Tendencia | null;
  cruzaUmbral: boolean;
  materias: Array<{ materia: string; desde: number | null; hasta: number | null; delta: number | null }>;
  /** Preguntas no logradas en el primer hito y logradas en el último. */
  brechasRecuperadas: string[];
  /** Preguntas logradas en el primer hito y no logradas en el último. */
  brechasNuevas: string[];
}

export interface ComparacionHitos {
  hitos: HitoId[];
  estudiantes: ProgresoEstudiante[];
  materias: Array<{ materia: string; medias: Array<{ hito: HitoId; media: number | null }>; delta: number | null }>;
  resumen: { comparados: number; mejoran: number; estables: number; retroceden: number; cruzanUmbral: number; deltaMedio: number | null };
}

export function tendenciaDe(delta: number | null): Tendencia | null {
  if (delta === null) return null;
  if (delta > 2) return 'mejora';
  if (delta < -2) return 'retroceso';
  return 'estable';
}

/** Compara los hitos disponibles en orden (Inicial → Intermedio → Final). */
export function compararHitos(analisis: AnalisisHito[]): ComparacionHitos | null {
  const orden = [...analisis].sort((a, b) => HITOS.indexOf(a.hito) - HITOS.indexOf(b.hito));
  if (orden.length < 2) return null;
  const claves = new Set(orden.flatMap((a) => a.estudiantes.map((e) => e.clave)));

  const estudiantes: ProgresoEstudiante[] = [];
  for (const clave of claves) {
    const perfiles = orden.map((a) => a.estudiantes.find((e) => e.clave === clave) ?? null);
    const ref = perfiles.find(Boolean)!;
    const a = perfiles[0];
    const b = perfiles[perfiles.length - 1];
    const delta = a && b ? r2(b.pctGlobal - a.pctGlobal) : null;

    const nombresMateria = new Set(perfiles.flatMap((p) => p?.materias.map((m) => m.materia) ?? []));
    const materias = Array.from(nombresMateria).map((materia) => {
      const desde = a?.materias.find((m) => m.materia === materia)?.pct ?? null;
      const hasta = b?.materias.find((m) => m.materia === materia)?.pct ?? null;
      return { materia, desde, hasta, delta: desde !== null && hasta !== null ? r2(hasta - desde) : null };
    });

    const estadoPreguntas = (p: PerfilDiagnostico | null) =>
      new Map(
        (p?.materias ?? []).flatMap((m) =>
          m.preguntas.map((q) => [`${m.materia} ${q.corta} · ${temaDe(q.etiqueta)}`, q.estado] as const),
        ),
      );
    const ea = estadoPreguntas(a);
    const eb = estadoPreguntas(b);
    const brechasRecuperadas: string[] = [];
    const brechasNuevas: string[] = [];
    for (const [id, estado] of ea) {
      const despues = eb.get(id);
      if (!despues || despues === 'sin_nota' || estado === 'sin_nota') continue;
      if (estado === 'no_lograda' && despues !== 'no_lograda') brechasRecuperadas.push(id);
      if (estado !== 'no_lograda' && despues === 'no_lograda') brechasNuevas.push(id);
    }

    estudiantes.push({
      clave,
      codigo: ref.codigo,
      nombre: ref.nombre,
      puntos: orden.map((an, i) => ({ hito: an.hito, pct: perfiles[i]?.pctGlobal ?? null })),
      delta,
      tendencia: tendenciaDe(delta),
      cruzaUmbral: !!(a && b && a.pctGlobal < UMBRAL_LOGRADO && b.pctGlobal >= UMBRAL_LOGRADO),
      materias,
      brechasRecuperadas,
      brechasNuevas,
    });
  }

  const nombresMat = new Set(orden.flatMap((a) => a.materias.map((m) => m.materia)));
  const materias = Array.from(nombresMat).map((materia) => {
    const medias = orden.map((a) => ({ hito: a.hito, media: a.materias.find((m) => m.materia === materia)?.estadisticos.media ?? null }));
    const ini = medias[0].media;
    const fin = medias[medias.length - 1].media;
    return { materia, medias, delta: ini !== null && fin !== null ? r2(fin - ini) : null };
  });

  const comparables = estudiantes.filter((e) => e.delta !== null);
  const deltas = comparables.map((e) => e.delta as number);
  estudiantes.sort((x, y) => (y.delta ?? -999) - (x.delta ?? -999));

  return {
    hitos: orden.map((a) => a.hito),
    estudiantes,
    materias,
    resumen: {
      comparados: comparables.length,
      mejoran: comparables.filter((e) => e.tendencia === 'mejora').length,
      estables: comparables.filter((e) => e.tendencia === 'estable').length,
      retroceden: comparables.filter((e) => e.tendencia === 'retroceso').length,
      cruzanUmbral: comparables.filter((e) => e.cruzaUmbral).length,
      deltaMedio: deltas.length ? estadisticos(deltas).media : null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Exportación (CSV compatible con Excel en español)                    */
/* ------------------------------------------------------------------ */

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'number' ? (Number.isInteger(valor) ? String(valor) : fmt(valor, 2)) : String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(filas: unknown[][]): string {
  // BOM para que Excel reconozca UTF-8; «;» porque Excel en español usa la coma como decimal.
  return '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
}

export function csvGlobal(a: AnalisisHito, anonimo: boolean): string {
  const materias = a.materias.map((m) => m.materia);
  const filas: unknown[][] = [
    [
      anonimo ? 'Código' : 'Estudiante',
      ...(anonimo ? [] : ['Correo']),
      'Hito',
      'Dominio global (%)',
      'Nivel',
      'Posición',
      'Cuartil',
      'Riesgo',
      ...materias.flatMap((m) => [`${m} (%)`, `${m} cuartil`, `${m} preguntas no logradas`]),
      'Errores conceptuales',
      'Errores procedimentales',
      'Descuidos',
      'Progreso P1→P3 (pp)',
      'Habilidades blandas (%)',
    ],
  ];
  for (const e of a.estudiantes) {
    filas.push([
      anonimo ? e.codigo : e.nombre,
      ...(anonimo ? [] : [e.correo]),
      a.hito,
      e.pctGlobal,
      e.nivel.etiqueta,
      e.posicion,
      e.cuartilGlobal,
      e.riesgo.nivel,
      ...materias.flatMap((nombre) => {
        const m = e.materias.find((mm) => mm.materia === nombre);
        return m ? [m.pct, m.cuartil, m.preguntasNoLogradas.join(' ')] : ['', '', ''];
      }),
      e.erroresPorTipo.conceptual,
      e.erroresPorTipo.procedimental,
      e.erroresPorTipo.descuido,
      e.progresoInterno,
      e.habilidadesBlandas,
    ]);
  }
  return aCsv(filas);
}

export function csvEstudiante(a: AnalisisHito, e: PerfilDiagnostico, anonimo: boolean): string {
  const filas: unknown[][] = [
    ['Estudiante', anonimo ? e.codigo : e.nombre],
    ['Hito', a.hito],
    ['Dominio global (%)', e.pctGlobal],
    ['Nivel', e.nivel.etiqueta],
    ['Posición', `${e.posicion} de ${a.estudiantes.length}`],
    [],
    ['Asignatura', 'Pregunta', 'Tema', 'Puntaje', 'Máximo', 'Dominio (%)', 'Media del curso (%)', 'Estado', 'Tipo de error', 'Competencias evaluadas'],
  ];
  for (const m of e.materias) {
    for (const p of m.preguntas) {
      filas.push([
        m.materia,
        p.corta,
        temaDe(p.etiqueta),
        p.valor,
        p.max,
        p.pct,
        p.mediaCurso,
        ETIQUETA_ESTADO[p.estado],
        p.tipoError ? TIPOS_ERROR[p.tipoError].etiqueta : '',
        p.competencias.join(' | '),
      ]);
    }
  }
  filas.push([], ['Recomendaciones'], ['Prioridad', 'Asignatura', 'Pregunta', 'Acción']);
  for (const r of e.recomendaciones) filas.push([r.prioridad, r.materia, r.pregunta, r.accion]);
  return aCsv(filas);
}

export const ETIQUETA_ESTADO: Record<EstadoPregunta, string> = {
  correcta: 'Correcta',
  con_perdidas: 'Lograda con pérdidas',
  no_lograda: 'No lograda',
  sin_nota: 'Sin nota',
};

export { temaDe, fmt as formatoNumero };
