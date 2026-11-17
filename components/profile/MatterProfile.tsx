'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria } from '@/lib/types';
import {
  filtrarFilas,
  ordenarPorPromedio,
  calcularDistribucion,
  promediosEvaluaciones,
  fmt,
  RubricasMateria,
  extraerTemaLimpio,
} from '@/lib/utils';
import { SearchInput, StatCard } from '@/components/ui';
import { DonutChart } from '@/components/DonutChart';
import { RankingTable } from '@/components/tables';

interface Props {
  resultado: ResultadoAuditoria;
  materiaActiva: string;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  rubricasMateria?: RubricasMateria;
}

const COLORES_RANGO = ['#b91c1c', '#ea580c', '#f59e0b', '#1177d1', '#15803d'];

function normalizarClave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function MatterProfile({
  resultado,
  materiaActiva,
  busqueda,
  onBusquedaChange,
  rubricasMateria,
}: Props) {
  const claveNorm = normalizarClave(materiaActiva);

  const claveStats = Object.keys(resultado.estadisticasMaterias || {}).find(
    (k) => normalizarClave(k) === claveNorm
  );
  const claveDatos = Object.keys(resultado.datosMaterias || {}).find(
    (k) => normalizarClave(k) === claveNorm
  );

  const stats = claveStats ? resultado.estadisticasMaterias[claveStats] : undefined;
  const filasCrudas = claveDatos ? resultado.datosMaterias[claveDatos] || [] : [];

  // Normalizar la nota real de cada estudiante (suma P1+P2+P3 si suman <= 100, o promedio si son parciales sobre 100)
  const filasBase = useMemo(() => {
    const maxSuma = filasCrudas.reduce(
      (max, f) => Math.max(max, (Number(f.P1) || 0) + (Number(f.P2) || 0) + (Number(f.P3) || 0)),
      0
    );
    const sonParcialesIndependientes = maxSuma > 100.5;

    return filasCrudas.map((f) => {
      const p1 = Number(f.P1) || 0;
      const p2 = Number(f.P2) || 0;
      const p3 = Number(f.P3) || 0;
      const suma = p1 + p2 + p3;

      let notaReal = Number(f.Promedio) || 0;
      if (suma > 0) {
        if (sonParcialesIndependientes) {
          const activos = [p1, p2, p3].filter((v) => v > 0);
          notaReal = activos.length > 0 ? suma / activos.length : 0;
        } else {
          notaReal = suma;
        }
      }

      return {
        ...f,
        Promedio: Number(notaReal.toFixed(1)),
      };
    });
  }, [filasCrudas]);

  const filas = useMemo(() => ordenarPorPromedio(filtrarFilas(filasBase, busqueda)), [filasBase, busqueda]);
  const distribucion = useMemo(() => calcularDistribucion(filasBase), [filasBase]);
  const evals = useMemo(() => promediosEvaluaciones(filasBase), [filasBase]);

  // Estadísticas sincronizadas directamente con filasBase
  const resumenSincronizado = useMemo(() => {
    const total = filasBase.length;
    if (total === 0) {
      return {
        total: stats?.total ?? 0,
        promedioGeneral: stats?.promedioGeneral ?? 0,
        aprobados: stats?.aprobados ?? 0,
        enRiesgo: stats?.enRiesgo ?? 0,
      };
    }

    const maxNota = Math.max(...filasBase.map((f) => f.Promedio), 0);
    const notaMinima = maxNota > 20 ? 51 : 11;

    const sumaPromedios = filasBase.reduce((acc, f) => acc + f.Promedio, 0);
    const aprobados = filasBase.filter((f) => f.Promedio >= notaMinima).length;
    const enRiesgo = total - aprobados;

    return {
      total,
      promedioGeneral: sumaPromedios / total,
      aprobados,
      enRiesgo,
    };
  }, [filasBase, stats]);

  const diagnosticoCurso = useMemo(() => {
    const listaEvals = [
      { key: 'p1' as const, label: 'Pregunta 1 (P1)', prom: evals.p1 },
      { key: 'p2' as const, label: 'Pregunta 2 (P2)', prom: evals.p2 },
      { key: 'p3' as const, label: 'Pregunta 3 (P3)', prom: evals.p3 },
    ].filter((item) => item.prom > 0);

    const baseEvals =
      listaEvals.length > 0
        ? listaEvals
        : [
            { key: 'p1' as const, label: 'Pregunta 1 (P1)', prom: evals.p1 },
            { key: 'p2' as const, label: 'Pregunta 2 (P2)', prom: evals.p2 },
            { key: 'p3' as const, label: 'Pregunta 3 (P3)', prom: evals.p3 },
          ];

    const mejor = [...baseEvals].sort((a, b) => b.prom - a.prom)[0];
    const peor = [...baseEvals].sort((a, b) => a.prom - b.prom)[0];

    const temaMejor = extraerTemaLimpio(rubricasMateria?.[mejor.key] || rubricasMateria?.general);
    const temaPeor = extraerTemaLimpio(rubricasMateria?.[peor.key] || rubricasMateria?.general);

    const tasaAprobacion =
      resumenSincronizado.total > 0
        ? Math.round((resumenSincronizado.aprobados / resumenSincronizado.total) * 100)
        : 0;

    const fortaleza = temaMejor
      ? `Al curso le fue mejor en ${mejor.label} (promedio ${fmt(mejor.prom)} pts), destacando en el tema "${temaMejor.titulo}". El ${tasaAprobacion}% del grupo aprueba la materia.`
      : `El curso alcanza su mejor rendimiento colectivo en ${mejor.label} con un promedio de ${fmt(mejor.prom)} pts (${tasaAprobacion}% de aprobación).`;

    const debilidad = temaPeor
      ? `Donde el grupo tuvo mayores dificultades fue en ${peor.label} (promedio ${fmt(peor.prom)} pts), correspondiente al tema "${temaPeor.titulo}". Se recomienda reforzar este contenido con ejercicios prácticos.`
      : `El menor rendimiento promedio del grupo se observa en ${peor.label} (${fmt(peor.prom)} pts), con ${resumenSincronizado.enRiesgo} estudiantes en riesgo.`;

    return { fortaleza, debilidad };
  }, [evals, rubricasMateria, resumenSincronizado]);

  if (!stats && filasBase.length === 0) return null;

  const tendencia = evals.p3 - evals.p1;
  const tendenciaLabel =
    tendencia > 2 ? 'Mejora sostenida' : tendencia < -2 ? 'Retroceso progresivo' : 'Rendimiento estable';
  const tendenciaColor =
    tendencia > 2 ? 'text-green-700' : tendencia < -2 ? 'text-red-700' : 'text-amber-700';
  const tendenciaBg =
    tendencia > 2
      ? 'bg-green-50 border-green-200'
      : tendencia < -2
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200';

  const segmentosDist = distribucion.map((r, i) => ({
    label: r.label,
    value: r.count,
    color: COLORES_RANGO[i] ?? '#6c757d',
  }));

  return (
    <div className="space-y-6">
      {/* Header de materia */}
      <div className="bg-white border border-[#ced4da] rounded">
        <div className="p-6 border-b border-[#ced4da] bg-[#f8f9fa]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-[#1177d1] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#6c757d] uppercase">Perfil Académico Consolidado</span>
                <h2 className="text-2xl font-bold text-[#212529]">{materiaActiva}</h2>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-[#6c757d] uppercase block">Promedio General</span>
              <span className="text-2xl font-bold text-[#1177d1]">
                {fmt(resumenSincronizado.promedioGeneral)} pts
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={`${resumenSincronizado.total}`} />
            <StatCard label="Aprobados" value={`${resumenSincronizado.aprobados}`} tone="positive" />
            <StatCard label="En Riesgo" value={`${resumenSincronizado.enRiesgo}`} tone="negative" />
            <div className={`rounded border p-4 ${tendenciaBg}`}>
              <p className="text-[10px] font-bold uppercase text-[#6c757d]">Tendencia</p>
              <p className={`text-sm font-bold mt-1 ${tendenciaColor}`}>{tendenciaLabel}</p>
            </div>
          </div>

          {/* Dona + comportamiento por evaluación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#ced4da] rounded p-5 overflow-x-auto">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2 mb-4">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Distribución del Curso
              </h4>
              <DonutChart
                segmentos={segmentosDist}
                centroValue={`${resumenSincronizado.total}`}
                centroLabel="Estudiantes"
                size={180}
              />
            </div>

            <div className="bg-[#f8f9fa] border border-[#ced4da] rounded p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Comportamiento por Pregunta
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { k: 'P1', key: 'p1' as const, v: evals.p1 },
                  { k: 'P2', key: 'p2' as const, v: evals.p2 },
                  { k: 'P3', key: 'p3' as const, v: evals.p3 },
                ]).map(({ k, key, v }) => {
                  const tema = extraerTemaLimpio(rubricasMateria?.[key] || rubricasMateria?.general);
                  return (
                    <div key={k} className="bg-white border border-[#ced4da] rounded p-3 text-center flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-[#6c757d] uppercase font-bold">{k}</div>
                        <div className="text-lg font-bold text-[#212529]">{fmt(v)}</div>
                      </div>
                      {tema && (
                        <div className="text-[11px] text-[#1177d1] font-medium mt-1.5 line-clamp-2">
                          {tema.titulo}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className={`text-xs font-semibold ${tendenciaColor}`}>
                {tendenciaLabel} ({tendencia >= 0 ? '+' : ''}{fmt(tendencia)} pts P1→P3)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">Fortalezas del Curso</h4>
              <p className="text-sm text-[#212529] leading-relaxed">
                {diagnosticoCurso.fortaleza}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Debilidades Detectadas</h4>
              <p className="text-sm text-[#212529] leading-relaxed">
                {diagnosticoCurso.debilidad}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-white border border-[#ced4da] rounded overflow-hidden">
        <div className="p-4 border-b border-[#ced4da] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#f8f9fa]">
          <span className="text-sm font-bold text-[#212529]">Ranking Estudiantil · {materiaActiva}</span>
          <div className="w-full sm:w-64">
            <SearchInput value={busqueda} onChange={onBusquedaChange} placeholder="Buscar alumno..." />
          </div>
        </div>
        <RankingTable filas={filas} showCorreo={false} />
      </div>
    </div>
  );
}