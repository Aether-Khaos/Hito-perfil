/**
 * Motor de diagnóstico por competencias.
 *
 * Traduce calificaciones (por dimensión P1/P2/P3 y, cuando existen, por reactivo)
 * en un perfil de dominio con brechas explicadas y acciones de refuerzo.
 *
 * Principio metodológico: el sistema no inventa precisión. Si solo hay nota por
 * ejercicio, informa el dominio del ejercicio y enumera las competencias que ese
 * ejercicio evalúa, marcándolas como «no verificable individualmente». Si hay nota
 * por reactivo, calcula el dominio de cada competencia.
 */

import {
  NIVELES_UAB,
  UMBRAL_LOGRADO,
  nivelDeLogro,
  porcentaje,
  promedioPonderado,
  type NivelLogro,
  type ResultadoPonderado,
} from './escala';
import {
  dimensionPorId,
  maximosDe,
  type Dimension,
  type MateriaCatalogo,
  type Reactivo,
} from './catalogo-reactivos';

export type EstadoReactivo =
  | 'logrado'
  | 'parcial'
  | 'no_logrado'
  | 'sin_evidencia'
  | 'no_atribuible';

export interface NotasMateria {
  /** Nombre de la materia tal como aparece en el libro o la base de datos. */
  materia: string;
  /** Puntaje por dimensión (P1, P2, P3 o GLOBAL). `null` = sin nota. */
  puntos: Record<string, number | null | undefined>;
  /** Puntaje por reactivo, cuando el libro trae detalle por ítem. */
  reactivos?: Record<string, number | null | undefined>;
}

export interface DiagnosticoReactivo {
  id: string;
  nombre: string;
  dimension: string;
  puntos: number;
  valor: number | null;
  pct: number | null;
  estado: EstadoReactivo;
  /** Fuente de la evidencia: nota propia del reactivo o atribución desde el ejercicio. */
  fuente: 'reactivo' | 'dimension';
  carencia: string;
  accion: string;
}

export interface DiagnosticoDimension {
  id: string;
  etiqueta: string;
  consigna: string;
  max: number;
  valor: number | null;
  pct: number | null;
  nivel: NivelLogro | null;
  evaluada: boolean;
  reactivos: DiagnosticoReactivo[];
}

export interface Brecha {
  tipo: 'dimension' | 'reactivo';
  id: string;
  nombre: string;
  materia: string;
  dimension: string;
  dimensionEtiqueta: string;
  /** Puntos del instrumento que se pierden o no se pueden acreditar. */
  puntosEnRiesgo: number;
  dominioPct: number | null;
  nivel: NivelLogro;
  descripcion: string;
  recomendacion: string;
  competencias: string[];
}

export interface DiagnosticoMateria {
  materia: string;
  catalogada: boolean;
  instrumento: string | null;
  pctGlobal: number;
  nivelGlobal: NivelLogro;
  promedio: ResultadoPonderado;
  cobertura: 'reactivo' | 'dimension';
  dimensiones: DiagnosticoDimension[];
  brechas: Brecha[];
  fortalezas: string[];
  advertencias: string[];
}

export interface DiagnosticoEstudiante {
  nombre: string;
  pctGlobal: number;
  nivelGlobal: NivelLogro;
  materias: DiagnosticoMateria[];
  brechas: Brecha[];
  fortalezas: string[];
  narrativa: string;
}

function estadoSegunPct(pct: number): EstadoReactivo {
  if (pct < 31) return 'no_logrado';
  if (pct < UMBRAL_LOGRADO) return 'parcial';
  return 'logrado';
}

function reactivoDiagnosticado(
  reactivo: Reactivo,
  dimensionId: string,
  valorReactivo: number | null,
  pctDimension: number | null,
): DiagnosticoReactivo {
  const base = {
    id: reactivo.id,
    nombre: reactivo.nombre,
    dimension: dimensionId,
    puntos: reactivo.puntos,
    carencia: reactivo.carencia,
    accion: reactivo.accion,
  };

  if (valorReactivo !== null) {
    const pct = porcentaje(valorReactivo, reactivo.puntos);
    return {
      ...base,
      valor: valorReactivo,
      pct: Number(pct.toFixed(2)),
      estado: estadoSegunPct(pct),
      fuente: 'reactivo',
    };
  }

  if (pctDimension === null) {
    return { ...base, valor: null, pct: null, estado: 'sin_evidencia', fuente: 'dimension' };
  }

  if (pctDimension >= UMBRAL_LOGRADO) {
    return { ...base, valor: null, pct: null, estado: 'no_atribuible', fuente: 'dimension' };
  }

  return { ...base, valor: null, pct: null, estado: 'no_atribuible', fuente: 'dimension' };
}

function valorReactivo(
  reactivos: Record<string, number | null | undefined> | undefined,
  id: string,
): number | null {
  if (!reactivos) return null;
  const valor = reactivos[id];
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  return Number(valor);
}

/** Diagnóstico de una asignatura para un estudiante. */
export function diagnosticarMateria(
  entrada: NotasMateria,
  materia: MateriaCatalogo | null,
): DiagnosticoMateria {
  const advertencias: string[] = [];

  if (!materia) {
    return {
      materia: entrada.materia,
      catalogada: false,
      instrumento: null,
      pctGlobal: 0,
      nivelGlobal: nivelDeLogro(0),
      promedio: {
        puntos: 0,
        maximoDisponible: 0,
        maximoTotal: 0,
        pct: 0,
        pctSobreTotal: 0,
        evaluacionesConsideradas: [],
        evaluacionesAusentes: [],
        completo: false,
      },
      cobertura: 'dimension',
      dimensiones: [],
      brechas: [],
      fortalezas: [],
      advertencias: [
        `La asignatura «${entrada.materia}» no está en el banco de reactivos: no es posible interpretar el puntaje por competencias.`,
      ],
    };
  }

  const maximos = maximosDe(materia);
  const promedio = promedioPonderado(entrada.puntos, maximos);
  const usaReactivos =
    !!entrada.reactivos && Object.keys(entrada.reactivos).length > 0;

  const dimensiones: DiagnosticoDimension[] = [];
  const brechas: Brecha[] = [];
  const fortalezas: string[] = [];

  for (const dimension of materia.dimensiones) {
    const valor = entrada.puntos[dimension.id];
    const tieneNota =
      valor !== null && valor !== undefined && Number.isFinite(Number(valor));
    const valorNum = tieneNota ? Number(valor) : null;
    const pct = tieneNota ? Number(porcentaje(valorNum as number, dimension.max).toFixed(2)) : null;
    const nivel = pct === null ? null : nivelDeLogro(pct);

    if (valorNum !== null && valorNum > dimension.max) {
      advertencias.push(
        `La nota de ${dimension.id} en ${materia.nombre} (${valorNum}) supera el máximo del instrumento (${dimension.max}); se acota para el cálculo.`,
      );
    }

    const reactivos = dimension.reactivos.map((reactivo) =>
      reactivoDiagnosticado(
        reactivo,
        dimension.id,
        valorReactivo(entrada.reactivos, reactivo.id),
        pct,
      ),
    );

    dimensiones.push({
      id: dimension.id,
      etiqueta: dimension.etiqueta,
      consigna: dimension.consigna,
      max: dimension.max,
      valor: valorNum,
      pct,
      nivel,
      evaluada: valorNum !== null,
      reactivos,
    });

    // Brechas por reactivo (solo cuando existe nota por ítem)
    if (usaReactivos) {
      for (const reactivo of reactivos) {
        if (reactivo.pct !== null && reactivo.pct < UMBRAL_LOGRADO) {
          brechas.push({
            tipo: 'reactivo',
            id: reactivo.id,
            nombre: reactivo.nombre,
            materia: materia.nombre,
            dimension: dimension.id,
            dimensionEtiqueta: dimension.etiqueta,
            puntosEnRiesgo: Number(
              (reactivo.puntos * (1 - reactivo.pct / 100)).toFixed(1),
            ),
            dominioPct: reactivo.pct,
            nivel: nivelDeLogro(reactivo.pct),
            descripcion: `Dominio del ${reactivo.pct.toFixed(1)} % en «${reactivo.nombre}» (${reactivo.valor}/${reactivo.puntos} pts). ${reactivo.carencia}`,
            recomendacion: reactivo.accion,
            competencias: [reactivo.nombre],
          });
        }
      }
    }

    // Brecha de dimensión (sin nota o con dominio insuficiente)
    if (valorNum === null) {
      brechas.push({
        tipo: 'dimension',
        id: `${dimension.id}`,
        nombre: dimension.etiqueta,
        materia: materia.nombre,
        dimension: dimension.id,
        dimensionEtiqueta: dimension.etiqueta,
        puntosEnRiesgo: dimension.max,
        dominioPct: null,
        nivel: nivelDeLogro(0),
        descripcion: `No hay calificación registrada para ${dimension.etiqueta} (0 de ${dimension.max} pts). Sin evidencia no se puede acreditar dominio de: ${dimension.reactivos
          .map((r) => r.nombre)
          .join('; ')}.`,
        recomendacion:
          'Verificar si la evaluación fue rendida y registrar la nota antes de usar el perfil académico; una ausencia no equivale a cero.',
        competencias: dimension.reactivos.map((r) => r.nombre),
      });
    } else if (pct !== null && pct < UMBRAL_LOGRADO) {
      brechas.push({
        tipo: 'dimension',
        id: `${dimension.id}`,
        nombre: dimension.etiqueta,
        materia: materia.nombre,
        dimension: dimension.id,
        dimensionEtiqueta: dimension.etiqueta,
        puntosEnRiesgo: Number((dimension.max - (valorNum ?? 0)).toFixed(1)),
        dominioPct: pct,
        nivel: nivelDeLogro(pct),
        descripcion: `Dominio del ${pct.toFixed(1)} % en ${dimension.etiqueta} (${valorNum ?? 0}/${dimension.max} pts). La evidencia no permite separar el desempeño ítem por ítem; el ejercicio evalúa: ${dimension.reactivos
          .map((r) => r.nombre)
          .join('; ')}.`,
        recomendacion:
          'Reforzar las competencias listadas y, en la próxima aplicación, registrar el puntaje por reactivo para ubicar con precisión el error.',
        competencias: dimension.reactivos.map((r) => r.nombre),
      });
    } else if (pct !== null && pct >= 71) {
      fortalezas.push(
        `${dimension.etiqueta}: ${pct.toFixed(1)} % de dominio (${valorNum}/${dimension.max} pts), nivel ${nivelDeLogro(pct).etiqueta}.`,
      );
    }
  }

  brechas.sort((a, b) => b.puntosEnRiesgo - a.puntosEnRiesgo);

  return {
    materia: materia.nombre,
    catalogada: true,
    instrumento: materia.instrumento,
    pctGlobal: promedio.pct,
    nivelGlobal: nivelDeLogro(promedio.pct),
    promedio,
    cobertura: usaReactivos ? 'reactivo' : 'dimension',
    dimensiones,
    brechas,
    fortalezas,
    advertencias,
  };
}

function narrativaEstudiante(
  nombre: string,
  pctGlobal: number,
  brechas: Brecha[],
  materias: DiagnosticoMateria[],
): string {
  const nivel = nivelDeLogro(pctGlobal);
  const partes: string[] = [];
  partes.push(
    `${nombre}: dominio global verificable del ${pctGlobal.toFixed(1)} % (nivel ${nivel.etiqueta}). ${nivel.descripcion}`,
  );

  const evaluadas = materias.filter((m) => m.catalogada && m.promedio.evaluacionesConsideradas.length > 0);
  if (evaluadas.length > 0) {
    partes.push(
      `Se interpretaron ${evaluadas.length} asignatura(s) con el banco de reactivos del Hito Inicial: ${evaluadas
        .map((m) => `${m.materia} (${m.pctGlobal.toFixed(1)} %)`)
        .join(', ')}.`,
    );
  }

  if (brechas.length === 0) {
    partes.push(
      'No se identifican brechas de dominio por debajo del nivel Logrado en las asignaturas evaluadas con reactivos.',
    );
    return partes.join(' ');
  }

  const principales = brechas.slice(0, 3);
  partes.push(
    `Carencias prioritarias: ${principales
      .map((b) => `${b.nombre} en ${b.materia} (${b.puntosEnRiesgo} pts en riesgo)`)
      .join('; ')}.`,
  );

  const acciones = Array.from(new Set(principales.map((b) => b.recomendacion)));
  partes.push(`Acciones sugeridas: ${acciones.join(' ')}`);
  partes.push(
    'El perfil es un apoyo descriptivo para la revisión docente: no constituye una calificación ni una predicción de desempeño.',
  );
  return partes.join(' ');
}

/** Consolidado del estudiante entre asignaturas. */
export function diagnosticarEstudiante(
  nombre: string,
  entradas: NotasMateria[],
  buscar: (materia: string) => MateriaCatalogo | null,
): DiagnosticoEstudiante {
  const materias = entradas.map((entrada) => diagnosticarMateria(entrada, buscar(entrada.materia)));
  const conDatos = materias.filter(
    (m) => m.catalogada && m.promedio.maximoDisponible > 0,
  );

  const puntos = conDatos.reduce((suma, m) => suma + m.promedio.puntos, 0);
  const maximos = conDatos.reduce((suma, m) => suma + m.promedio.maximoDisponible, 0);
  const pctGlobal = maximos > 0 ? Number(((puntos / maximos) * 100).toFixed(2)) : 0;

  const brechas = materias.flatMap((m) => m.brechas).sort((a, b) => b.puntosEnRiesgo - a.puntosEnRiesgo);
  const fortalezas = materias.flatMap((m) => m.fortalezas);

  return {
    nombre,
    pctGlobal,
    nivelGlobal: nivelDeLogro(pctGlobal),
    materias,
    brechas,
    fortalezas,
    narrativa: narrativaEstudiante(nombre, pctGlobal, brechas, materias),
  };
}

export interface ResumenCurso {
  materia: string;
  estudiantes: number;
  pctPromedio: number;
  nivelPromedio: NivelLogro;
  pctLogradoOMas: number;
  distribucion: Record<string, number>;
  carenciasFrecuentes: Array<{
    id: string;
    nombre: string;
    materia: string;
    estudiantes: number;
    pctEstudiantes: number;
    puntosEnRiesgo: number;
  }>;
}

/** Agrega los diagnósticos individuales en un resumen por asignatura. */
export function resumirCurso(diagnosticos: DiagnosticoEstudiante[]): ResumenCurso[] {
  const porMateria = new Map<string, DiagnosticoMateria[]>();
  for (const diagnostico of diagnosticos) {
    for (const materia of diagnostico.materias) {
      if (!materia.catalogada) continue;
      const lista = porMateria.get(materia.materia) ?? [];
      lista.push(materia);
      porMateria.set(materia.materia, lista);
    }
  }

  const resumen: ResumenCurso[] = [];
  for (const [materia, lista] of porMateria) {
    const conNota = lista.filter((m) => m.promedio.maximoDisponible > 0);
    if (conNota.length === 0) continue;

    const pctPromedio =
      conNota.reduce((suma, m) => suma + m.pctGlobal, 0) / conNota.length;

    const distribucion: Record<string, number> = {};
    for (const nivel of NIVELES_UAB) distribucion[nivel.etiqueta] = 0;
    let logradoOMas = 0;
    for (const m of conNota) {
      distribucion[m.nivelGlobal.etiqueta] += 1;
      if (m.pctGlobal >= UMBRAL_LOGRADO) logradoOMas += 1;
    }

    const conteo = new Map<string, { nombre: string; estudiantes: number; puntos: number }>();
    for (const m of conNota) {
      for (const brecha of m.brechas) {
        if (brecha.tipo !== 'dimension') continue;
        const actual = conteo.get(brecha.id) ?? {
          nombre: brecha.nombre,
          estudiantes: 0,
          puntos: 0,
        };
        actual.estudiantes += 1;
        actual.puntos += brecha.puntosEnRiesgo;
        conteo.set(brecha.id, actual);
      }
    }

    const carenciasFrecuentes = Array.from(conteo.entries())
      .map(([id, valor]) => ({
        id,
        nombre: valor.nombre,
        materia,
        estudiantes: valor.estudiantes,
        pctEstudiantes: Number(((valor.estudiantes / conNota.length) * 100).toFixed(1)),
        puntosEnRiesgo: Number((valor.puntos / valor.estudiantes).toFixed(1)),
      }))
      .sort((a, b) => b.estudiantes - a.estudiantes);

    resumen.push({
      materia,
      estudiantes: conNota.length,
      pctPromedio: Number(pctPromedio.toFixed(2)),
      nivelPromedio: nivelDeLogro(pctPromedio),
      pctLogradoOMas: Number(((logradoOMas / conNota.length) * 100).toFixed(1)),
      distribucion,
      carenciasFrecuentes,
    });
  }

  return resumen.sort((a, b) => a.pctPromedio - b.pctPromedio);
}

/** Máximos por dimensión de una asignatura catalogada (útil para normalizar en la API). */
export function maximosParaMateria(nombre: string, buscar: (m: string) => MateriaCatalogo | null) {
  const materia = buscar(nombre);
  return materia ? maximosDe(materia) : null;
}

/** Lista de dimensiones esperadas para una asignatura. */
export function dimensionesDeMateria(materia: MateriaCatalogo): Dimension[] {
  return materia.dimensiones;
}

export { dimensionPorId };
