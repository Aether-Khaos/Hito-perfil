import { ResultadoAuditoria, PerfilEstudiante } from '@/lib/types';

export type FilaMateria = ResultadoAuditoria['datosMaterias'][string][number];

export interface RubricasMateria {
  p1?: string;
  p2?: string;
  p3?: string;
  general?: string;
}

export interface ExamenParseado {
  materia?: string;
  anio?: number;
  nivel?: string;
  semestre?: string;
  unidades?: string;
  secciones: RubricasMateria;
}

export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '0.0';
  return Number(n).toFixed(1);
}

export function normalizarTextoMateria(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['de', 'del', 'la', 'las', 'los', 'a', 'al', 'y', 'en', 'i'].includes(w))
    .map((w) => (w.length > 4 ? w.replace(/s$/, '') : w))
    .join(' ')
    .trim();
}

export function buscarRubricaPorMateria(
  rubricas: Record<string, RubricasMateria>,
  materia: string
): RubricasMateria | undefined {
  if (!materia || !rubricas) return undefined;
  if (rubricas[materia]) return rubricas[materia];

  const target = normalizarTextoMateria(materia);
  if (!target) return undefined;

  const entradas = Object.entries(rubricas);

  const exactaNorm = entradas.find(([k]) => normalizarTextoMateria(k) === target);
  if (exactaNorm) return exactaNorm[1];

  const parcial = entradas.find(([k]) => {
    const nk = normalizarTextoMateria(k);
    return nk.length > 3 && (nk.includes(target) || target.includes(nk));
  });
  return parcial?.[1];
}

export function detectarEscala(filas: FilaMateria[], promedios: number[] = []): number {
  const valores = [
    ...filas.flatMap((f) => [f.P1, f.P2, f.P3, f.Promedio]),
    ...promedios,
  ].filter((v) => typeof v === 'number' && !Number.isNaN(v));

  const max = valores.length > 0 ? Math.max(...valores) : 100;
  return max > 20 ? 100 : 20;
}

export function filtrarFilas(filas: FilaMateria[], busqueda: string): FilaMateria[] {
  const t = busqueda.trim().toLowerCase();
  if (!t) return filas;
  return filas.filter(
    (f) =>
      f.Nombre?.toLowerCase().includes(t) ||
      (f.Correo && f.Correo.toLowerCase().includes(t))
  );
}

export function ordenarPorPromedio(filas: FilaMateria[]): FilaMateria[] {
  return [...filas].sort((a, b) => (b.Promedio ?? 0) - (a.Promedio ?? 0));
}

export function obtenerMejorPeor(filas: FilaMateria[]): {
  mejor: FilaMateria | null;
  peor: FilaMateria | null;
} {
  if (filas.length === 0) return { mejor: null, peor: null };
  const ordenadas = ordenarPorPromedio(filas);
  return {
    mejor: ordenadas[0] ?? null,
    peor: ordenadas[ordenadas.length - 1] ?? null,
  };
}

export function promedioClase(perfiles: PerfilEstudiante[]): number {
  if (perfiles.length === 0) return 0;
  const suma = perfiles.reduce((acc, p) => acc + (p.promedioGeneral ?? 0), 0);
  return suma / perfiles.length;
}

export function rangoPosiciones(perfiles: PerfilEstudiante[]): Map<string, number> {
  const ordenados = [...perfiles].sort((a, b) => (b.promedioGeneral ?? 0) - (a.promedioGeneral ?? 0));
  const map = new Map<string, number>();
  ordenados.forEach((p, idx) => {
    map.set(p.nombre, idx + 1);
  });
  return map;
}

export function calcularPercentil(
  estudiante: PerfilEstudiante,
  todos: PerfilEstudiante[]
): number {
  if (todos.length <= 1) return 100;
  const porDebajo = todos.filter(
    (e) => (e.promedioGeneral ?? 0) < (estudiante.promedioGeneral ?? 0)
  ).length;
  return (porDebajo / (todos.length - 1)) * 100;
}

export function promediosEvaluaciones(filas: FilaMateria[]): {
  p1: number;
  p2: number;
  p3: number;
  promedio: number;
} {
  if (filas.length === 0) return { p1: 0, p2: 0, p3: 0, promedio: 0 };
  const n = filas.length;
  const p1 = filas.reduce((acc, f) => acc + (f.P1 ?? 0), 0) / n;
  const p2 = filas.reduce((acc, f) => acc + (f.P2 ?? 0), 0) / n;
  const p3 = filas.reduce((acc, f) => acc + (f.P3 ?? 0), 0) / n;
  const promedio = filas.reduce((acc, f) => acc + (f.Promedio ?? 0), 0) / n;
  return { p1, p2, p3, promedio };
}

export function calcularDistribucion(
  filas: FilaMateria[]
): Array<{ label: string; count: number }> {
  const maxEscala = detectarEscala(filas);
  const rangos =
    maxEscala === 100
      ? [
          { label: '0 - 50 (Reprobado)', min: -Infinity, max: 50.99 },
          { label: '51 - 60 (Suficiente)', min: 51, max: 60.99 },
          { label: '61 - 75 (Regular)', min: 61, max: 75.99 },
          { label: '76 - 89 (Bueno)', min: 76, max: 89.99 },
          { label: '90 - 100 (Excelente)', min: 90, max: Infinity },
        ]
      : [
          { label: '0 - 10 (Reprobado)', min: -Infinity, max: 10.99 },
          { label: '11 - 12 (Suficiente)', min: 11, max: 12.99 },
          { label: '13 - 15 (Regular)', min: 13, max: 15.99 },
          { label: '16 - 18 (Bueno)', min: 16, max: 18.99 },
          { label: '19 - 20 (Excelente)', min: 19, max: Infinity },
        ];

  return rangos.map((r) => ({
    label: r.label,
    count: filas.filter((f) => (f.Promedio ?? 0) >= r.min && (f.Promedio ?? 0) <= r.max).length,
  }));
}

export interface TemaPreguntaExtraido {
  titulo: string;
  subtemas: string[];
  criteriosSolucion: string[];
  totalPreguntas: number;
}

const REGEX_RUIDO_ADMINISTRATIVO =
  /^(universidad|facultad|carrera|ingenier[ií]a|gesti[oó]n|semestre|[áa]rea|materia|asignatura|hito|evaluaci[oó]n|fecha|estudiante|nota|vobo|firma|instrucciones|puntaje|valor|tiempo|espacio\s+(?:de|para)|respuesta\s+en\s+la\s+hoja|#\s*escriba|c[oó]digo\s+modelo)/i;

const REGEX_CODIGO_CRUDO =
  /^(?:class\s+|def\s+|print\(|return\b|self\.|super\(\)|if\s+|else:|for\s+|while\s+|import\s+|from\s+|[a-z_][a-z0-9_]*\s*=)/i;

function limpiarEnunciadoItem(raw: string): string {
  return raw
    .replace(/^(?:pregunta\s*\d+|p\d+|\d+[\.\)\-]|[a-z][\.\)]|[-•])\s*[:\.\-\—]?\s*/i, '')
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:pts?|puntos?|min(?:utos)?)\s*\)/gi, '')
    .replace(/\[\s*\d+(?:\.\d+)?\s*(?:pts?|puntos?)\s*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extraerTemaLimpio(texto?: string): TemaPreguntaExtraido | null {
  if (!texto) return null;

  const partesSol = texto.split(/\[SOLUCIONARIO\]/i);
  const bloqueEnunciado = partesSol[0] || texto;
  const bloqueSolucion = partesSol[1] || '';

  const lineas = bloqueEnunciado
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !REGEX_RUIDO_ADMINISTRATIVO.test(l));

  if (lineas.length === 0) return null;

  // Detectar todas las preguntas/ítems dentro del bloque (1..20, Pregunta 1..20, a)..z))
  const preguntasDetectadas: string[] = [];
  for (let idx = 0; idx < lineas.length; idx++) {
    const l = lineas[idx];
    if (REGEX_RUIDO_ADMINISTRATIVO.test(l) || REGEX_CODIGO_CRUDO.test(l)) continue;

    const esItemPregunta =
      /^(?:pregunta\s*\d+|\d{1,2}[\.\)\-]|[a-z][\.\)]|[-•]|teor[ií]a\s*:|implementaci[oó]n\s*:|pr[aá]ctica\s*:)/i.test(
        l
      );

    if (esItemPregunta) {
      const numMatch = l.match(/^(?:pregunta\s*(\d+)|(\d{1,2})[\.\)\-])/i);
      const prefijoNum = numMatch ? `P${numMatch[1] || numMatch[2]}: ` : '';
      const limpio = limpiarEnunciadoItem(l);
      if (limpio.length > 6 && !REGEX_RUIDO_ADMINISTRATIVO.test(limpio)) {
        const textoFinal = `${prefijoNum}${limpio}`;
        const recortado = textoFinal.length > 130 ? `${textoFinal.slice(0, 127)}...` : textoFinal;
        if (!preguntasDetectadas.includes(recortado)) {
          preguntasDetectadas.push(recortado);
        }
      }
    }
  }

  // Determinar el título principal de la sección
  const lineaTema = lineas.find((l) => /^(?:tema|unidad|t[ií]tulo|competencia|bloque)\s*[:\-]/i.test(l));
  const primeraLineaEsPreguntaNumerada = /^(?:pregunta\s*\d+|\d{1,2}[\.\)\-])\s+/i.test(lineas[0]);

  let titulo = '';
  if (lineaTema) {
    titulo = lineaTema.replace(/^(?:tema|unidad|t[ií]tulo|competencia|bloque)\s*[:\-]\s*/i, '').trim();
  } else if (primeraLineaEsPreguntaNumerada && preguntasDetectadas.length > 1) {
    // Si la sección empieza directo con "1. ...", "2. ...", ..., "15. ...", resumir el conjunto
    titulo = `Cuestionario de ${preguntasDetectadas.length} preguntas (${limpiarEnunciadoItem(lineas[0]).slice(0, 55)}...)`;
  } else {
    titulo = lineas[0]
      .replace(/^(?:secci[oó]n\s*p[123]|parte\s*p[123]|pregunta\s*\d+|p\d+|\d+[\.\)])\s*[:\.\-\—]?\s*/i, '')
      .replace(/\(\s*\d+\s*min(?:utos)?\s*\)/gi, '')
      .replace(/\[\s*\d+\s*puntos?\s*\]/gi, '')
      .replace(/[—\-–:]+\s*$/g, '')
      .trim();
  }

  if (!titulo || REGEX_RUIDO_ADMINISTRATIVO.test(titulo)) return null;

  // Subtemas: si hay muchas preguntas (ej. 10-15), conservarlas todas (hasta 15) sin cortar en 4
  const subtemas: string[] = [];
  if (preguntasDetectadas.length > 0) {
    // Si la primera línea ya fue usada como título principal, no repetirla como subtema
    const inicio = !primeraLineaEsPreguntaNumerada && !lineaTema ? 0 : 0;
    for (let i = inicio; i < preguntasDetectadas.length; i++) {
      const item = preguntasDetectadas[i];
      if (limpiarEnunciadoItem(item).toLowerCase() === titulo.toLowerCase()) continue;
      subtemas.push(item);
      if (subtemas.length >= 15) break;
    }
  } else {
    for (const l of lineas.slice(1)) {
      if (REGEX_RUIDO_ADMINISTRATIVO.test(l) || REGEX_CODIGO_CRUDO.test(l)) continue;
      if (l.length > 15 && !/^(consigna|fragmento|tabla|salida|justificaci[oó]n|criterio)/i.test(l)) {
        const recortado = l.length > 130 ? `${l.slice(0, 127)}...` : l;
        subtemas.push(recortado);
        if (subtemas.length >= 6) break;
      }
    }
  }

  // Extraer criterios y respuestas clave del solucionario (soporta 1..15 ítems)
  const criteriosSolucion: string[] = [];
  if (bloqueSolucion) {
    const lineasSol = bloqueSolucion
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const l of lineasSol) {
      if (REGEX_CODIGO_CRUDO.test(l) || REGEX_RUIDO_ADMINISTRATIVO.test(l)) continue;

      if (
        /^#\s*\d{1,2}\.\s*/.test(l) ||
        /^(?:pregunta\s*\d+|\d{1,2}[\.\)\-])\s*/i.test(l) ||
        /^[-•]\s*(?:0\s*puntos|respuesta\s+esperada|clave|soluci[oó]n)/i.test(l) ||
        /^(?:polimorfismo|herencia|encapsulamiento|permite\s+que|se\s+define|el\s+estudiante\s+debe|respuesta\s*:)/i.test(l)
      ) {
        const limpio = l
          .replace(/^[-•#]\s*/, '')
          .replace(/^(?:respuesta\s+esperada|respuesta|soluci[oó]n|clave)\s*:\s*/i, '')
          .replace(/\(\s*\d+\s*pts?\s*\)/gi, '')
          .trim();
        if (limpio.length > 8 && !criteriosSolucion.includes(limpio)) {
          const recortado = limpio.length > 130 ? `${limpio.slice(0, 127)}...` : limpio;
          criteriosSolucion.push(recortado);
          if (criteriosSolucion.length >= 10) break;
        }
      }
    }
  }

  return {
    titulo,
    subtemas,
    criteriosSolucion,
    totalPreguntas: Math.max(preguntasDetectadas.length, 1),
  };
}

function obtenerRubricaPorParcial(
  rubricasMateria: RubricasMateria | undefined,
  key: 'p1' | 'p2' | 'p3'
): string | undefined {
  if (!rubricasMateria) return undefined;
  if (rubricasMateria[key]) return rubricasMateria[key];
  if (rubricasMateria.general) {
    const reparseado = parsearExamenGoogleDoc(rubricasMateria.general);
    if (reparseado.secciones[key]) return reparseado.secciones[key];
    // Si el examen entero es una sola lista de preguntas sin P2/P3, usar general en P1
    if (key === 'p1') return rubricasMateria.general;
  }
  return undefined;
}

function formatearListaCompacta(items: string[], maxVisible = 6): string {
  if (items.length <= maxVisible) return items.join(' | ');
  const visibles = items.slice(0, maxVisible).join(' | ');
  return `${visibles} (+${items.length - maxVisible} preguntas más de esta sección)`;
}

function describirDominioPositivo(tema: TemaPreguntaExtraido | null): string {
  if (!tema) return '';
  const partes: string[] = [`Tema dominado: "${tema.titulo}".`];
  if (tema.subtemas.length > 0) {
    partes.push(
      `Preguntas/áreas resueltas correctamente (${tema.subtemas.length}): ${formatearListaCompacta(
        tema.subtemas
      )}.`
    );
  } else if (tema.criteriosSolucion.length > 0) {
    partes.push(`Aplica correctamente: ${formatearListaCompacta(tema.criteriosSolucion, 4)}.`);
  }
  return ` ${partes.join(' ')}`;
}

function describirDificultadNegativa(tema: TemaPreguntaExtraido | null): string {
  if (!tema) return '';
  const partes: string[] = [`Tema con dificultad: "${tema.titulo}".`];
  if (tema.subtemas.length > 0) {
    partes.push(
      `Preguntas/puntos donde presentó fallas (${tema.subtemas.length}): ${formatearListaCompacta(
        tema.subtemas
      )}.`
    );
  }
  return ` ${partes.join(' ')}`;
}

function generarConsejoRefuerzoDetallado(
  tema: TemaPreguntaExtraido | null,
  etiquetaSeccion: string
): string {
  if (!tema) {
    return `${etiquetaSeccion}: Repasar la teoría fundamental y resolver ejercicios prácticos similares a los evaluados en esta sección.`;
  }

  const bloques: string[] = [`${etiquetaSeccion} — Reforzar "${tema.titulo}":`];

  if (tema.subtemas.length > 0) {
    bloques.push(
      `1) Repasar y resolver paso a paso las preguntas del bloque: ${formatearListaCompacta(
        tema.subtemas,
        6
      )}.`
    );
  }

  if (tema.criteriosSolucion.length > 0) {
    bloques.push(
      `2) Verificar los criterios y respuestas clave del solucionario: ${formatearListaCompacta(
        tema.criteriosSolucion,
        5
      )}.`
    );
  } else {
    bloques.push(
      `2) Realizar ejercicios integradores validando cada caso de prueba y la estructura lógica completa.`
    );
  }

  return bloques.join(' ');
}

export function enriquecerPerfilGeneral(
  estudiante: PerfilEstudiante,
  rubricas: Record<string, RubricasMateria>
): { fortalezas: string[]; debilidades: string[]; consecuencias: string } {
  const entradas = Object.entries(estudiante.materias || {});
  if (entradas.length === 0) return estudiante.perfilGeneral;

  const ordenadas = [...entradas].sort((a, b) => b[1].promedio - a[1].promedio);
  const mejor = ordenadas[0];
  const peor = ordenadas[ordenadas.length - 1];

  const fortalezas: string[] = [];
  const debilidades: string[] = [];

  for (const [mat, notas] of ordenadas) {
    const rub = buscarRubricaPorMateria(rubricas, mat);
    const evalsAll = [
      { key: 'p1' as const, label: 'Sección P1', val: notas.p1 ?? 0 },
      { key: 'p2' as const, label: 'Sección P2', val: notas.p2 ?? 0 },
      { key: 'p3' as const, label: 'Sección P3', val: notas.p3 ?? 0 },
    ];
    // Filtrar secciones activas (si una materia solo evalúa P1 y P2/P3 están en 0 sin rúbrica, no marcarlas como falla)
    const evals = evalsAll.filter(
      (e) => e.val > 0 || Boolean(obtenerRubricaPorParcial(rub, e.key))
    );
    const lista = evals.length > 0 ? evals : evalsAll;

    const mejorEv = [...lista].sort((a, b) => b.val - a.val)[0];
    const peorEv = [...lista].sort((a, b) => a.val - b.val)[0];

    const temaMejor = extraerTemaLimpio(obtenerRubricaPorParcial(rub, mejorEv.key));
    const temaPeor = extraerTemaLimpio(obtenerRubricaPorParcial(rub, peorEv.key));

    if (notas.promedio >= 61 && temaMejor) {
      fortalezas.push(
        `${mat} (${mejorEv.label}: ${fmt(mejorEv.val)} pts): Dominas "${temaMejor.titulo}"${
          temaMejor.subtemas[0] ? ` (${temaMejor.subtemas[0]})` : ''
        }.`
      );
    }

    if ((peorEv.val < 61 || notas.promedio < 70) && temaPeor) {
      debilidades.push(
        `${mat} (${peorEv.label}: ${fmt(peorEv.val)} pts): Necesitas reforzar "${temaPeor.titulo}"${
          temaPeor.subtemas[0] ? ` — incluye: ${temaPeor.subtemas[0]}` : ''
        }.`
      );
    }
  }

  if (fortalezas.length === 0 && mejor) {
    const [mat, notas] = mejor;
    const rub = buscarRubricaPorMateria(rubricas, mat);
    const tema = extraerTemaLimpio(
      obtenerRubricaPorParcial(rub, 'p1') ||
        obtenerRubricaPorParcial(rub, 'p2') ||
        obtenerRubricaPorParcial(rub, 'p3')
    );
    if (tema) {
      fortalezas.push(
        `Mejor desempeño en ${mat} (${fmt(notas.promedio)} pts), destacando en "${tema.titulo}".`
      );
    } else if (estudiante.perfilGeneral.fortalezas.length > 0) {
      fortalezas.push(...estudiante.perfilGeneral.fortalezas);
    }
  }

  if (debilidades.length === 0 && peor) {
    const [mat, notas] = peor;
    const rub = buscarRubricaPorMateria(rubricas, mat);
    const evals = [
      { key: 'p1' as const, label: 'Sección P1', val: notas.p1 ?? 0 },
      { key: 'p2' as const, label: 'Sección P2', val: notas.p2 ?? 0 },
      { key: 'p3' as const, label: 'Sección P3', val: notas.p3 ?? 0 },
    ].filter((e) => e.val > 0 || Boolean(obtenerRubricaPorParcial(rub, e.key)));
    const peorEv = [...(evals.length > 0 ? evals : [{ key: 'p1' as const, label: 'Sección P1', val: notas.p1 ?? 0 }])].sort(
      (a, b) => a.val - b.val
    )[0];
    const tema = extraerTemaLimpio(obtenerRubricaPorParcial(rub, peorEv.key));
    if (tema) {
      debilidades.push(
        `Área prioritaria en ${mat} (${peorEv.label}: ${fmt(peorEv.val)} pts): "${tema.titulo}"${
          tema.subtemas[0] ? ` (${tema.subtemas[0]})` : ''
        }.`
      );
    } else if (estudiante.perfilGeneral.debilidades.length > 0) {
      debilidades.push(...estudiante.perfilGeneral.debilidades);
    }
  }

  const rubPeorMat = peor ? buscarRubricaPorMateria(rubricas, peor[0]) : undefined;
  const temaCritico = rubPeorMat
    ? extraerTemaLimpio(
        obtenerRubricaPorParcial(rubPeorMat, 'p3') ||
          obtenerRubricaPorParcial(rubPeorMat, 'p2') ||
          obtenerRubricaPorParcial(rubPeorMat, 'p1')
      )
    : null;

  const consecuencias =
    peor && temaCritico
      ? `El rendimiento general está condicionado por ${peor[0]} (${fmt(peor[1].promedio)} pts), especialmente en "${temaCritico.titulo}". Consolidar este contenido evitará arrastre de vacíos en materias correlativas.`
      : estudiante.perfilGeneral.consecuencias;

  return {
    fortalezas: fortalezas.slice(0, 4),
    debilidades: debilidades.slice(0, 4),
    consecuencias,
  };
}

export interface AnalisisMateriaEstudiante {
  evaluaciones: { p1: number; p2: number; p3: number; promedio: number };
  promediosCurso: { p1: number; p2: number; p3: number; promedio: number };
  promedioCurso: number;
  diffVsCurso: number;
  posicion: number;
  total: number;
  percentil: number;
  tendencia: number;
  tendenciaCurso: number;
  tendenciaLabel: string;
  diagnostico: string;
  proyeccion: string;
  fortalezas: string[];
  debilidades: string[];
  planAccion: string[];
  otrasMaterias: Array<{ materia: string; promedio: number; diff: number }>;
}

export function analizarEstudianteEnMateria(
  estudiante: PerfilEstudiante,
  materia: string,
  filas: FilaMateria[],
  rubricasMateria?: RubricasMateria
): AnalisisMateriaEstudiante | null {
  const matData = estudiante.materias?.[materia];
  if (!matData || filas.length === 0) return null;

  const evaluaciones = {
    p1: matData.p1 ?? 0,
    p2: matData.p2 ?? 0,
    p3: matData.p3 ?? 0,
    promedio: matData.promedio ?? 0,
  };

  const promediosCurso = promediosEvaluaciones(filas);
  const promedioCurso = promediosCurso.promedio;
  const diffVsCurso = evaluaciones.promedio - promedioCurso;

  const ordenados = ordenarPorPromedio(filas);
  const idx = ordenados.findIndex(
    (f) => f.Nombre.trim().toLowerCase() === estudiante.nombre.trim().toLowerCase()
  );
  const posicion =
    idx !== -1 ? idx + 1 : filas.filter((f) => f.Promedio > evaluaciones.promedio).length + 1;
  const total = filas.length;
  const porDebajo = filas.filter((f) => f.Promedio < evaluaciones.promedio).length;
  const percentil = total > 1 ? (porDebajo / (total - 1)) * 100 : 100;

  // Detectar qué secciones realmente están activas en este curso (por si solo evalúan P1 o P1+P2)
  const allEvals = [
    { key: 'p1' as const, label: 'Sección P1', corto: 'Sección P1', nota: evaluaciones.p1, curso: promediosCurso.p1 },
    { key: 'p2' as const, label: 'Sección P2', corto: 'Sección P2', nota: evaluaciones.p2, curso: promediosCurso.p2 },
    { key: 'p3' as const, label: 'Sección P3', corto: 'Sección P3', nota: evaluaciones.p3, curso: promediosCurso.p3 },
  ];

  const evalsActivas = allEvals.filter(
    (ev) => ev.curso > 0 || ev.nota > 0 || Boolean(rubricasMateria?.[ev.key])
  );
  const evals = evalsActivas.length > 0 ? evalsActivas : allEvals;

  const primeraEval = evals[0];
  const ultimaEval = evals[evals.length - 1];
  const tendencia = evals.length > 1 ? ultimaEval.nota - primeraEval.nota : diffVsCurso;
  const tendenciaCurso = evals.length > 1 ? ultimaEval.curso - primeraEval.curso : 0;
  const tendenciaLabel =
    tendencia > 2 ? 'Ascendente' : tendencia < -2 ? 'Descendente' : 'Estable';

  const mejorEval = [...evals].sort((a, b) => b.nota - a.nota)[0];
  const peorEval = [...evals].sort((a, b) => a.nota - b.nota)[0];

  const temaMejor = extraerTemaLimpio(obtenerRubricaPorParcial(rubricasMateria, mejorEval.key));
  const temaPeor = extraerTemaLimpio(obtenerRubricaPorParcial(rubricasMateria, peorEval.key));

  const diagnostico =
    evals.length === 1
      ? diffVsCurso >= 2
        ? `Le fue bien en ${mejorEval.label} (${fmt(mejorEval.nota)} pts, +${fmt(diffVsCurso)} pts sobre el curso)${
            temaMejor ? `, dominando "${temaMejor.titulo}"` : ''
          }.`
        : diffVsCurso <= -2
          ? `Presenta dificultades en ${peorEval.label} (${fmt(peorEval.nota)} pts, ${fmt(diffVsCurso)} pts vs curso)${
              temaPeor ? ` en "${temaPeor.titulo}"` : ''
            }.`
          : `Rendimiento parejo al promedio del curso (${fmt(promedioCurso)} pts) en ${mejorEval.label}${
              temaMejor ? ` ("${temaMejor.titulo}")` : ''
            }.`
      : diffVsCurso >= 2
        ? `Le fue bien por encima del promedio del curso (+${fmt(diffVsCurso)} pts). Destacó en ${mejorEval.label} (${fmt(mejorEval.nota)} pts)${
            temaMejor ? ` dominando "${temaMejor.titulo}"` : ''
          }${
            peorEval.nota < peorEval.curso
              ? `, aunque bajó su rendimiento en ${peorEval.label} (${fmt(peorEval.nota)} pts)${
                  temaPeor ? ` sobre "${temaPeor.titulo}"` : ''
                }.`
              : '.'
          }`
        : diffVsCurso <= -2
          ? `Presenta dificultades frente a la media del curso (${fmt(diffVsCurso)} pts). Su mayor caída estuvo en ${peorEval.label} (${fmt(peorEval.nota)} pts)${
              temaPeor ? ` en "${temaPeor.titulo}"` : ''
            }, mientras que su mejor bloque fue ${mejorEval.label} (${fmt(mejorEval.nota)} pts).`
          : `Rendimiento alineado al promedio del curso (${fmt(promedioCurso)} pts): le fue bien en ${mejorEval.label} (${fmt(mejorEval.nota)} pts)${
              temaMejor ? ` ("${temaMejor.titulo}")` : ''
            } y debe reforzar ${peorEval.label} (${fmt(peorEval.nota)} pts)${
              temaPeor ? ` ("${temaPeor.titulo}")` : ''
            }.`;

  const proyeccion =
    tendencia > 2
      ? `Evolución positiva (+${fmt(tendencia)} pts); consolidando "${
          temaPeor?.titulo || peorEval.corto
        }" asegurará un excelente cierre de semestre.`
      : tendencia < -2
        ? `Muestra una baja en el tramo final (${fmt(tendencia)} pts); es prioritario reforzar "${
            temaPeor?.titulo || peorEval.corto
          }" antes de la siguiente evaluación.`
        : `Mantiene un ritmo constante; reforzar "${
            temaPeor?.titulo || `los contenidos de ${peorEval.corto}`
          }" le permitirá elevar su promedio general.`;

  const fortalezas: string[] = [];
  const debilidades: string[] = [];
  const planAccion: string[] = [];

  for (const ev of evals) {
    const tema = extraerTemaLimpio(obtenerRubricaPorParcial(rubricasMateria, ev.key));
    const dif = ev.nota - ev.curso;

    if (dif >= 1) {
      fortalezas.push(
        `En ${ev.label} le fue bien (${fmt(ev.nota)} pts, +${fmt(dif)} sobre el curso).${describirDominioPositivo(
          tema
        )}`
      );
    } else if (dif <= -1) {
      debilidades.push(
        `En ${ev.label} le fue mal (${fmt(ev.nota)} pts, ${fmt(dif)} respecto al curso).${describirDificultadNegativa(
          tema
        )}`
      );
      planAccion.push(generarConsejoRefuerzoDetallado(tema, ev.corto));
    }
  }

  if (fortalezas.length === 0) {
    fortalezas.push(
      `Su mejor desempeño estuvo en ${mejorEval.label} (${fmt(mejorEval.nota)} pts).${describirDominioPositivo(
        temaMejor
      )}`
    );
  }
  if (debilidades.length === 0) {
    debilidades.push(
      `Su menor puntaje relativo estuvo en ${peorEval.label} (${fmt(peorEval.nota)} pts).${describirDificultadNegativa(
        temaPeor
      )}`
    );
  }
  if (planAccion.length === 0) {
    planAccion.push(generarConsejoRefuerzoDetallado(temaPeor, peorEval.corto));
  }

  const otrasMaterias = Object.entries(estudiante.materias || {})
    .filter(([m]) => m !== materia)
    .map(([m, d]) => ({
      materia: m,
      promedio: d.promedio ?? 0,
      diff: (d.promedio ?? 0) - evaluaciones.promedio,
    }));

  return {
    evaluaciones,
    promediosCurso,
    promedioCurso,
    diffVsCurso,
    posicion,
    total,
    percentil,
    tendencia,
    tendenciaCurso,
    tendenciaLabel,
    diagnostico,
    proyeccion,
    fortalezas,
    debilidades,
    planAccion,
    otrasMaterias,
  };
}

// --- PARSER DE EXAMEN + SOLUCIONARIO DESDE GOOGLE DOCS ---

function normalizarNivel(raw: string): string | undefined {
  const t = raw.trim().toLowerCase();
  if (t.includes('inicial')) return 'Inicial';
  if (t.includes('intermedio')) return 'Intermedio';
  if (t.includes('avanzado') || t.includes('final')) return 'Avanzado';
  return undefined;
}

function limpiarTextoPregunta(bloque: string): string {
  return bloque
    .split('\n')
    .map((l) => l.replace(/\u00a0/g, ' ').trimEnd())
    .filter((l) => {
      const t = l.trim();
      if (!t) return true;
      if (
        /^(vobo|firma\s+(docente|estudiante|direcci[oó]n)|estudiante:|nota de|evaluaci[oó]n:|fecha:|gesti[oó]n:|hito de evaluaci[oó]n:|carrera:|semestre:|universidad\s+adventista)/i.test(
          t
        )
      ) {
        return false;
      }
      if (/^_{5,}$/.test(t)) return false;
      if (/^espacio\s+(?:de|para)\s+(?:resoluci[oó]n|la\s+implementaci[oó]n)/i.test(t)) return false;
      if (/^[“"].*[”"]$/.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parsearExamenGoogleDoc(textoBruto: string): ExamenParseado {
  const texto = textoBruto.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');

  // Los encabezados pegados desde Google Docs suelen venir en una fila de tabla
  // ("Área: Lógica\tGestión: 2026\tHito de Evaluación: Inicial"), con viñetas o en negrita.
  // Por eso no se exige inicio de línea y la captura se corta en tabulador, barra o la siguiente etiqueta.
  const FIN = String.raw`(?=\t|\s{3,}|\||\s+(?:Gesti[oó]n|A[ñn]o|Hito|Nivel|Semestre|Docente|Fecha|[ÁA]rea|Materia|Asignatura)\b[^:\n]{0,25}:|$)`;
  const etiqueta = (nombres: string) =>
    new RegExp(String.raw`(?:^|[\s|*•\-])(?:${nombres})\s*\**\s*:\s*\**\s*([^\n\t|]+?)\s*\**\s*${FIN}`, 'im');
  const matchArea = texto.match(etiqueta(String.raw`[ÁA]rea|Materia|Asignatura`));
  const matchGestion = texto.match(/(?:Gesti[oó]n|A[ñn]o)\s*\**\s*:\s*\**\s*(?:[IVX]+\s*[\/\-]\s*)?(\d{4})/i);
  const matchHito = texto.match(etiqueta(String.raw`Hito(?:\s+de\s+Evaluaci[oó]n)?|Nivel`));
  const matchSemestre = texto.match(etiqueta('Semestre'));

  const materia = matchArea?.[1]?.trim();
  const anio = matchGestion ? Number(matchGestion[1]) : undefined;
  const nivel = matchHito ? normalizarNivel(matchHito[1]) : undefined;
  const semestre = matchSemestre?.[1]?.trim();

  const matchUnidades = texto.match(
    /[ÁA]reas\/Unidades a Evaluar\s*:([\s\S]*?)(?=\n\s*(?:VoBo|Firma|INSTRUCCIONES|SECCI[OÓ]N\s*P1|PREGUNTA\s*1|P1\b|1[\.\)]))/i
  );
  const unidades = matchUnidades
    ? matchUnidades[1]
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n')
    : undefined;

  const idxRubricaFinal = texto.search(/^[ \t]*R[ÚU]BRICA\s+OFICIAL\s+DE\s+EVALUACI[OÓ]N/im);
  const textoUtil = idxRubricaFinal !== -1 ? texto.slice(0, idxRubricaFinal) : texto;

  const idxSolucionario = textoUtil.search(/^[ \t]*SOLUCIONARIO\b/im);
  const cuerpoExamen = idxSolucionario !== -1 ? textoUtil.slice(0, idxSolucionario) : textoUtil;
  const cuerpoSolucion = idxSolucionario !== -1 ? textoUtil.slice(idxSolucionario) : '';

  // Detectar si el documento está organizado por secciones explícitas: SECCIÓN P1, SECCIÓN P2, SECCIÓN P3
  const regexSeccionesExplicitas =
    /^[ \t]*(?:SECCI[OÓ]N\s*P([123])|PARTE\s*P([123])|BLOQUE\s*P([123]))(?:\s*[:\.\-\—\)\]]\s*(.*)|\s+(.*))?$/gim;
  const matchesSecciones = [...cuerpoExamen.matchAll(regexSeccionesExplicitas)];

  // Detectar preguntas numeradas (1..20 o PREGUNTA 1..20)
  const regexPreguntasNumeradas =
    /^[ \t]*(?:PREGUNTA\s*(\d{1,2})|P(\d{1,2}))(?:\s*[:\.\-\—\)\]]\s*(.*)|\s+(.*))?$/gim;
  const matchesPreguntas = [...cuerpoExamen.matchAll(regexPreguntasNumeradas)];

  const bloquesEx: Partial<Record<'p1' | 'p2' | 'p3', string>> = {};

  if (matchesSecciones.length > 0) {
    // Caso A: El examen viene dividido en SECCIÓN P1, SECCIÓN P2, SECCIÓN P3 (con N preguntas dentro de cada una)
    for (let i = 0; i < matchesSecciones.length; i++) {
      const m = matchesSecciones[i];
      const num = (m[1] || m[2] || m[3]) as '1' | '2' | '3';
      const key = `p${num}` as 'p1' | 'p2' | 'p3';
      const inicio = m.index! + m[0].length;
      const fin = i + 1 < matchesSecciones.length ? matchesSecciones[i + 1].index! : cuerpoExamen.length;
      const tituloLinea = (m[4] || m[5] || '').trim();
      const contenido = limpiarTextoPregunta(
        (tituloLinea ? `${tituloLinea}\n` : '') + cuerpoExamen.slice(inicio, fin)
      );
      if (contenido) {
        bloquesEx[key] = bloquesEx[key] ? `${bloquesEx[key]}\n\n${contenido}` : contenido;
      }
    }
  } else if (matchesPreguntas.length > 0 && matchesPreguntas.length <= 3) {
    // Caso B: Examen clásico de 1 a 3 preguntas (PREGUNTA 1, PREGUNTA 2, PREGUNTA 3)
    for (let i = 0; i < matchesPreguntas.length; i++) {
      const m = matchesPreguntas[i];
      const num = (m[1] || m[2]) as '1' | '2' | '3';
      const key = `p${num}` as 'p1' | 'p2' | 'p3';
      const inicio = m.index! + m[0].length;
      const fin = i + 1 < matchesPreguntas.length ? matchesPreguntas[i + 1].index! : cuerpoExamen.length;
      const tituloLinea = (m[3] || m[4] || '').trim();
      const contenido = limpiarTextoPregunta(
        (tituloLinea ? `${tituloLinea}\n` : '') + cuerpoExamen.slice(inicio, fin)
      );
      if (contenido) bloquesEx[key] = contenido;
    }
  } else {
    // Caso C: Examen con 4 a 15+ preguntas sin etiquetas SECCIÓN P1/P2/P3 (todo corresponde al bloque P1)
    const limpio = limpiarTextoPregunta(cuerpoExamen);
    if (limpio) bloquesEx.p1 = limpio;
  }

  // Extraer bloques del solucionario
  const bloquesSol: Partial<Record<'p1' | 'p2' | 'p3', string>> = {};
  if (cuerpoSolucion) {
    const regexSolSeccion =
      /^[ \t]*SOLUCIONARIO\s*[\-\—:]?\s*(?:SECCI[OÓ]N\s*P([123])|PARTE\s*P([123]))(.*)$/gim;
    const matchesSolSec = [...cuerpoSolucion.matchAll(regexSolSeccion)];

    const regexSolPreg =
      /^[ \t]*SOLUCIONARIO\s*[\-\—:]?\s*(?:PREGUNTA\s*(\d{1,2})|P(\d{1,2}))(.*)$/gim;
    const matchesSolPreg = [...cuerpoSolucion.matchAll(regexSolPreg)];

    if (matchesSolSec.length > 0) {
      for (let i = 0; i < matchesSolSec.length; i++) {
        const m = matchesSolSec[i];
        const num = (m[1] || m[2]) as '1' | '2' | '3';
        const key = `p${num}` as 'p1' | 'p2' | 'p3';
        const inicio = m.index! + m[0].length;
        const fin = i + 1 < matchesSolSec.length ? matchesSolSec[i + 1].index! : cuerpoSolucion.length;
        const contenido = limpiarTextoPregunta(cuerpoSolucion.slice(inicio, fin));
        if (contenido) bloquesSol[key] = contenido;
      }
    } else if (matchesSolPreg.length > 0 && matchesSolPreg.length <= 3 && matchesSecciones.length === 0) {
      for (let i = 0; i < matchesSolPreg.length; i++) {
        const m = matchesSolPreg[i];
        const num = (m[1] || m[2]) as '1' | '2' | '3';
        const key = `p${num}` as 'p1' | 'p2' | 'p3';
        const inicio = m.index! + m[0].length;
        const fin = i + 1 < matchesSolPreg.length ? matchesSolPreg[i + 1].index! : cuerpoSolucion.length;
        const contenido = limpiarTextoPregunta(cuerpoSolucion.slice(inicio, fin));
        if (contenido) bloquesSol[key] = contenido;
      }
    } else {
      // Solucionario completo de 10-15 preguntas asociado a P1
      const limpioSol = limpiarTextoPregunta(cuerpoSolucion.replace(/^[ \t]*SOLUCIONARIO[^\n]*\n?/i, ''));
      if (limpioSol) bloquesSol.p1 = limpioSol;
    }
  }

  const secciones: RubricasMateria = {};
  for (const key of ['p1', 'p2', 'p3'] as const) {
    if (bloquesEx[key] && bloquesSol[key]) {
      secciones[key] = `${bloquesEx[key]}\n\n[SOLUCIONARIO]\n${bloquesSol[key]}`;
    } else if (bloquesEx[key]) {
      secciones[key] = bloquesEx[key];
    } else if (bloquesSol[key]) {
      secciones[key] = bloquesSol[key];
    }
  }

  if (!secciones.p1 && !secciones.p2 && !secciones.p3) {
    const limpio = limpiarTextoPregunta(cuerpoExamen);
    if (limpio) secciones.general = limpio;
  }

  return {
    materia,
    anio,
    nivel,
    semestre,
    unidades,
    secciones,
  };
}