import { FilaMateria, RangoDistribucion, PerfilEstudiante } from './types';
import { UMBRAL_LOGRADO, nivelDeLogro } from './escala';

export const fmt = (n: number | null | undefined, dec = 1) =>
  n !== null && n !== undefined && Number.isFinite(n) ? n.toFixed(dec) : '—';

export function detectarEscala(filas: FilaMateria[], extras: number[] = []): number {
  const valores = [
    ...filas.flatMap((f) => [f.Promedio, f.P1, f.P2, f.P3]),
    ...extras,
  ].filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor));
  const max = valores.length ? Math.max(...valores) : 20;
  return max > 20 ? 100 : 20;
}

export function filtrarFilas(filas: FilaMateria[], texto: string) {
  const t = texto.trim().toLowerCase();
  if (!t) return filas;
  return filas.filter(
    (f) => f.Nombre.toLowerCase().includes(t) || (f.Correo ?? '').toLowerCase().includes(t),
  );
}

export function ordenarPorPromedio(filas: FilaMateria[]) {
  return [...filas].sort((a, b) => b.Promedio - a.Promedio);
}

/**
 * Distribución por niveles institucionales de la UAB (Inicio, Proceso, Logrado,
 * Destacado, Excepcional). Antes se usaban cortes propios (0/40/60/70/85/100)
 * que no coincidían con la escala oficial del informe de evaluación.
 */
export function calcularDistribucion(filas: FilaMateria[], scaleMax?: number): RangoDistribucion[] {
  const colores: RangoDistribucion['color'][] = ['rose', 'amber', 'yellow', 'cyan', 'emerald'];
  const niveles = [
    { label: 'Inicio', min: 0, max: 30 },
    { label: 'Proceso', min: 31, max: 50 },
    { label: 'Logrado', min: 51, max: 70 },
    { label: 'Destacado', min: 71, max: 89 },
    { label: 'Excepcional', min: 90, max: 100 },
  ];

  const escala = scaleMax && scaleMax > 0 ? scaleMax : 100;
  const aPorcentaje = (valor: number) => (valor / escala) * 100;
  const aEscala = (valor: number) => Number(((valor / 100) * escala).toFixed(1));

  return niveles.map((nivel, indice) => ({
    label: nivel.label,
    min: aEscala(nivel.min),
    max: aEscala(nivel.max),
    count: filas.filter(
      (fila) => nivelDeLogro(aPorcentaje(fila.Promedio)).etiqueta === nivel.label,
    ).length,
    color: colores[indice],
  }));
}

export function obtenerMejorPeor(filas: FilaMateria[]) {
  if (!filas.length) return { mejor: null as FilaMateria | null, peor: null as FilaMateria | null };
  const ord = ordenarPorPromedio(filas);
  return { mejor: ord[0], peor: ord[ord.length - 1] };
}

/** Promedio por evaluación ignorando las evaluaciones sin nota (no las cuenta como cero). */
export function promediosEvaluaciones(filas: FilaMateria[]) {
  const media = (clave: 'P1' | 'P2' | 'P3') => {
    const valores = filas
      .map((fila) => fila[clave])
      .filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor));
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  };
  return { p1: media('P1'), p2: media('P2'), p3: media('P3') };
}

/** Convierte un valor posiblemente nulo en número (0 cuando no hay dato). */
function numero(valor: number | null | undefined): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

/** Media de una dimensión en el curso, ignorando las evaluaciones sin nota. */
function mediaCurso(filas: FilaMateria[], clave: 'P1' | 'P2' | 'P3'): number {
  const valores = filas
    .map((fila) => fila[clave])
    .filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor));
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
}

export function rangoPosiciones(estudiantes: PerfilEstudiante[]) {
  const sorted = [...estudiantes].sort((a, b) => b.promedioGeneral - a.promedioGeneral);
  return new Map(sorted.map((e, i) => [e.nombre, i + 1]));
}

export function calcularPercentil(est: PerfilEstudiante, todos: PerfilEstudiante[]) {
  if (!todos.length) return 0;
  const menores = todos.filter((e) => e.promedioGeneral < est.promedioGeneral).length;
  return (menores / todos.length) * 100;
}

export function promedioClase(todos: PerfilEstudiante[]) {
  if (!todos.length) return 0;
  return todos.reduce((a, e) => a + e.promedioGeneral, 0) / todos.length;
}

// ============================================================
// Análisis ULTRA DETALLADO: estudiante × materia
// ============================================================

export interface AnalisisMateriaEstudiante {
  posicion: number;
  total: number;
  percentil: number;
  promedioCurso: number;
  diffVsCurso: number;
  tendencia: number;
  tendenciaCurso: number;
  tendenciaLabel: string;
  evaluaciones: { p1: number; p2: number; p3: number; promedio: number };
  promediosCurso: { p1: number; p2: number; p3: number };
  mejorEval: { nombre: 'P1' | 'P2' | 'P3'; valor: number; deltaCurso: number };
  peorEval: { nombre: 'P1' | 'P2' | 'P3'; valor: number; deltaCurso: number };
  explicacionP1: string;
  explicacionP2: string;
  explicacionP3: string;
  diagnostico: string;
  proyeccion: string;
  fortalezas: string[];
  debilidades: string[];
  planAccion: string[];
  otrasMaterias: Array<{ materia: string; promedio: number; diff: number }>;
}

export function analizarEstudianteEnMateria(
  est: PerfilEstudiante,
  materia: string,
  filasMateria: FilaMateria[]
): AnalisisMateriaEstudiante | null {
  const data = est.materias[materia];
  if (!data || !filasMateria.length) return null;

  const total = filasMateria.length;
  const orden = [...filasMateria].sort((a, b) => b.Promedio - a.Promedio);
  const idx = orden.findIndex((f) => f.Nombre === est.nombre);
  const posicion = idx >= 0 ? idx + 1 : total;
  const percentil = total > 1 ? ((total - posicion) / (total - 1)) * 100 : 100;

  const p1Curso = mediaCurso(filasMateria, 'P1');
  const p2Curso = mediaCurso(filasMateria, 'P2');
  const p3Curso = mediaCurso(filasMateria, 'P3');
  const promedioCurso = (p1Curso + p2Curso + p3Curso) / 3;
  const diffVsCurso = data.promedio - promedioCurso;

  const p1Est = numero(data.p1);
  const p2Est = numero(data.p2);
  const p3Est = numero(data.p3);
  const tendencia = p3Est - p1Est;
  const tendenciaCurso = p3Curso - p1Curso;
  const tendenciaLabel =
    tendencia > 1 ? 'Mejora sostenida' :
    tendencia < -1 ? 'Retroceso progresivo' :
    'Rendimiento estable';

  const evals: Array<{ nombre: 'P1' | 'P2' | 'P3'; valor: number; deltaCurso: number }> = [
    { nombre: 'P1', valor: p1Est, deltaCurso: p1Est - p1Curso },
    { nombre: 'P2', valor: p2Est, deltaCurso: p2Est - p2Curso },
    { nombre: 'P3', valor: p3Est, deltaCurso: p3Est - p3Curso },
  ];
  const mejorEval = [...evals].sort((a, b) => b.valor - a.valor)[0];
  const peorEval = [...evals].sort((a, b) => a.valor - b.valor)[0];

  // Explicaciones por evaluación
  function explicarEval(
    nombreEval: 'P1' | 'P2' | 'P3',
    tuyo: number,
    curso: number,
    anterior: number | null
  ): string {
    const diff = tuyo - curso;
    const cambio = anterior !== null ? tuyo - anterior : null;
    let texto = `En ${nombreEval} obtuviste ${tuyo.toFixed(1)} pts, frente a un promedio del curso de ${curso.toFixed(1)}. `;
    if (diff > 1) texto += `Estás ${diff.toFixed(1)} pts por encima del curso — una ventaja clara. `;
    else if (diff < -1) texto += `Estás ${Math.abs(diff).toFixed(1)} pts por debajo del curso — aquí hay un área de mejora. `;
    else texto += `Estás alineado con el curso (±${Math.abs(diff).toFixed(1)} pts). `;
    if (cambio !== null) {
      if (cambio > 1) texto += `Respecto a ${nombreEval === 'P2' ? 'P1' : 'P2'}, mejoraste +${cambio.toFixed(1)} pts.`;
      else if (cambio < -1) texto += `Respecto a ${nombreEval === 'P2' ? 'P1' : 'P2'}, retrocediste ${Math.abs(cambio).toFixed(1)} pts.`;
      else texto += `Respecto a ${nombreEval === 'P2' ? 'P1' : 'P2'}, te mantuviste estable (${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)} pts).`;
    }
    return texto;
  }

  const explicacionP1 = explicarEval('P1', p1Est, p1Curso, null);
  const explicacionP2 = explicarEval('P2', p2Est, p2Curso, p1Est);
  const explicacionP3 = explicarEval('P3', p3Est, p3Curso, p2Est);

  // Diagnóstico global
  let diagnostico = `En ${materia} ocupas la posición #${posicion} de ${total} (percentil ${Math.round(percentil)}). `;
  if (percentil >= 85) diagnostico += `Estás en el grupo de élite del curso: te ubicas entre los mejores. `;
  else if (percentil >= 60) diagnostico += `Estás por encima de la mediana, tu rendimiento es competitivo aunque hay margen para escalar. `;
  else if (percentil >= 30) diagnostico += `Estás en la mitad baja del curso. Necesitas un salto cualitativo para salir de la zona media. `;
  else diagnostico += `Estás en el cuartil inferior del curso. Intervención inmediata recomendada. `;

  if (Math.abs(diffVsCurso) < 0.5) diagnostico += `Tu promedio (${data.promedio.toFixed(1)}) es prácticamente igual al del curso (${promedioCurso.toFixed(1)}).`;
  else if (diffVsCurso > 0) diagnostico += `Tu promedio (${data.promedio.toFixed(1)}) supera al del curso (${promedioCurso.toFixed(1)}) por +${diffVsCurso.toFixed(1)} pts.`;
  else diagnostico += `Tu promedio (${data.promedio.toFixed(1)}) está por debajo del curso (${promedioCurso.toFixed(1)}) por ${Math.abs(diffVsCurso).toFixed(1)} pts.`;

  // Proyección
  let proyeccion = '';
  if (tendencia > 1.5) {
    proyeccion = `Si mantienes la tendencia de +${tendencia.toFixed(1)} pts entre P1 y P3, proyectas cerrar el próximo hito con aproximadamente ${(data.promedio + tendencia).toFixed(1)} pts. Ojo: el promedio del curso también se mueve (${tendenciaCurso >= 0 ? '+' : ''}${tendenciaCurso.toFixed(1)} pts), así que el avance real depende de mantenerte por encima de esa curva.`;
  } else if (tendencia < -1.5) {
    proyeccion = `Si el retroceso de ${tendencia.toFixed(1)} pts continúa, proyectas terminar el próximo hito en ${Math.max(0, data.promedio + tendencia).toFixed(1)} pts, lo cual puede acercarte a zona de riesgo. El curso, en cambio, ${tendenciaCurso >= 0 ? 'subió' : 'bajó'} ${Math.abs(tendenciaCurso).toFixed(1)} pts. Intervenir ahora es clave.`;
  } else {
    proyeccion = `Tu rendimiento es estable (${tendencia >= 0 ? '+' : ''}${tendencia.toFixed(1)} pts de P1 a P3). Sin cambios en la estrategia, proyectas mantenerte alrededor de ${data.promedio.toFixed(1)} pts. Para saltar de nivel necesitas cambiar algo concreto: método de estudio, asistencia a tutoría, práctica adicional.`;
  }

  // Fortalezas / debilidades específicas
  const fortalezas: string[] = [];
  const debilidades: string[] = [];
  const umbralApr = UMBRAL_LOGRADO;
  const umbralReg = 31;

  if (percentil >= 85) fortalezas.push(`Top del curso: posición #${posicion}/${total}. Estás entre los mejores de ${materia}.`);
  else if (percentil >= 60) fortalezas.push(`Percentil ${Math.round(percentil)}: superas al ${Math.round(percentil)}% del curso en ${materia}.`);

  if (diffVsCurso > 1) fortalezas.push(`+${diffVsCurso.toFixed(1)} pts sobre el promedio del curso — ventaja real, no estadística.`);
  if (tendencia > 1) fortalezas.push(`Curva ascendente: mejoraste +${tendencia.toFixed(1)} pts entre P1 y P3.`);

  fortalezas.push(`Tu evaluación más alta fue ${mejorEval.nombre} con ${mejorEval.valor.toFixed(1)} pts${mejorEval.deltaCurso > 0 ? ` (+${mejorEval.deltaCurso.toFixed(1)} vs el curso)` : ''}.`);

  if (data.promedio >= umbralApr) fortalezas.push(`Promedio en nivel Logrado (${data.promedio.toFixed(1)} % ≥ ${umbralApr}).`);

  if (diffVsCurso < -1) debilidades.push(`${Math.abs(diffVsCurso).toFixed(1)} pts por debajo del promedio del curso — necesitas cerrar esa brecha.`);
  if (tendencia < -1) debilidades.push(`Retroceso de ${Math.abs(tendencia).toFixed(1)} pts entre P1 y P3. La curva va en bajada.`);
  if (peorEval.valor < peorEval.deltaCurso + peorEval.valor - 1) {
    debilidades.push(`${peorEval.nombre} fue tu punto más bajo (${peorEval.valor.toFixed(1)} pts)${peorEval.deltaCurso < 0 ? `, ${Math.abs(peorEval.deltaCurso).toFixed(1)} pts debajo del curso en esa misma evaluación` : ''}.`);
  }
  if (data.promedio < umbralReg) debilidades.push(`Promedio en nivel Inicio (${data.promedio.toFixed(1)} % < ${umbralReg}). Intervención urgente.`);

  if (fortalezas.length === 0) fortalezas.push(`Rendimiento dentro de lo esperado para ${materia}. Sin destacados particulares.`);
  if (debilidades.length === 0) debilidades.push(`Sin debilidades críticas en ${materia}.`);

  // Plan de acción concreto
  const planAccion: string[] = [];
  if (peorEval.deltaCurso < -1) {
    planAccion.push(`Refuerzo en ${peorEval.nombre}: agenda tutoría específica para revisar los temas de esa evaluación. Pedir a un compañero destacado que te explique los ejercicios resueltos es una buena opción.`);
  }
  if (tendencia < -1) {
    planAccion.push(`Detén el retroceso: identifica qué cambió entre P1 y P3 (¿faltaste a clases? ¿cambió la dificultad? ¿dejaste de practicar?). Sin diagnóstico, el retroceso seguirá.`);
  }
  if (diffVsCurso < -1) {
    planAccion.push(`Cierra la brecha con el curso: pídele al profesor que te marque 2-3 temas clave donde el grupo entero rinde mejor que tú. Enfócate en esos.`);
  }
  if (percentil >= 85) {
    planAccion.push(`Estás en el top: no bajes la guardia. Busca ejercicios de mayor dificultad para mantener el nivel y no aburrirte. Considera apoyar a compañeros (enseñar consolida el aprendizaje).`);
  }
  if (data.promedio < umbralReg) {
    planAccion.push(`Zona de riesgo: habla con el profesor esta semana. Un plan de recuperación temprano (antes del próximo examen) es mucho más efectivo que uno reactivo.`);
  }  if (planAccion.length === 0) {
    planAccion.push(`Mantén la estrategia actual: estás estable y alineado con el curso. Para subir de nivel, incrementa la práctica autónoma y busca retroalimentación sobre tus ejercicios.`);
  }

  // Otras materias del estudiante (comparativa)
  const otrasMaterias = Object.entries(est.materias)
    .filter(([m]) => m !== materia)
    .map(([m, d]) => ({ materia: m, promedio: d.promedio, diff: d.promedio - data.promedio }))
    .sort((a, b) => b.promedio - a.promedio);

  return {
    posicion, total, percentil,
    promedioCurso, diffVsCurso,
    tendencia, tendenciaCurso, tendenciaLabel,
    evaluaciones: { p1: p1Est, p2: p2Est, p3: p3Est, promedio: data.promedio },
    promediosCurso: { p1: p1Curso, p2: p2Curso, p3: p3Curso },
    mejorEval, peorEval,
    explicacionP1, explicacionP2, explicacionP3,
    diagnostico, proyeccion,
    fortalezas, debilidades, planAccion,
    otrasMaterias,
  };
}
