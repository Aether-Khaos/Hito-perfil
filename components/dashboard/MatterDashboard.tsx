'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria } from '@/lib/types';
import {
  filtrarFilas, ordenarPorPromedio, calcularDistribucion,
  obtenerMejorPeor, promediosEvaluaciones, fmt,
} from '@/lib/utils';
import { StatCard, SearchInput } from '@/components/ui';
import { DonutChart } from '@/components/DonutChart';
import { RankingTable } from '@/components/tables';

interface Props {
  resultado: ResultadoAuditoria;
  materiaActiva: string;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
}

// Colores académicos funcionales para rangos de nota
const COLORES_RANGO = ['#b91c1c', '#ea580c', '#f59e0b', '#1177d1', '#15803d'];

export function MatterDashboard({ resultado, materiaActiva, busqueda, onBusquedaChange }: Props) {
  const stats = resultado.estadisticasMaterias[materiaActiva];
  const filasCrudas = resultado.datosMaterias[materiaActiva] || [];

  // Normalizar nota real por fila (si P1+P2+P3 suman <= 100, esa es la nota real; si vienen sobre 100 cada uno, promediar activos)
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
  const { mejor, peor } = useMemo(() => obtenerMejorPeor(filasBase), [filasBase]);
  const evals = useMemo(() => promediosEvaluaciones(filasBase), [filasBase]);

  // Métricas sincronizadas directamente con filasBase para que coincidan al 100% con la dona
  const resumenSincronizado = useMemo(() => {
    const total = filasBase.length;
    if (total === 0) {
      return {
        total: 0,
        promedioGeneral: 0,
        aprobados: 0,
        enRiesgo: 0,
        porcentajeAprobados: 0,
        porcentajeRiesgo: 0,
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
      porcentajeAprobados: (aprobados / total) * 100,
      porcentajeRiesgo: (enRiesgo / total) * 100,
    };
  }, [filasBase]);

  if (!stats) return null;

  // Segmentos para la dona de distribución
  const segmentosDist = distribucion.map((r, i) => ({
    label: r.label,
    value: r.count,
    color: COLORES_RANGO[i] ?? '#6c757d',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#ced4da]">
        <div className="w-10 h-10 rounded bg-[#1177d1] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#212529]">Dashboard · {materiaActiva}</h2>
          <p className="text-xs text-[#6c757d]">Vista general del rendimiento del curso</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-[#e3f0fb] text-[#1177d1] text-[11px] font-semibold border border-[#b8d9f3]">
          {resumenSincronizado.total} estudiantes
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Evaluados" value={`${resumenSincronizado.total}`} hint="estudiantes" />
        <StatCard label="Promedio Materia" value={`${fmt(resumenSincronizado.promedioGeneral)} pts`} />
        <StatCard label={`Aprobados (${resumenSincronizado.aprobados})`} value={`${fmt(resumenSincronizado.porcentajeAprobados)}%`} tone="positive" />
        <StatCard label={`En Riesgo (${resumenSincronizado.enRiesgo})`} value={`${fmt(resumenSincronizado.porcentajeRiesgo)}%`} tone="negative" />
      </div>

      {/* Dona + Extremos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#ced4da] rounded p-5">
          <h3 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2 mb-4">
            <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
            Distribución de Notas
          </h3>
          <DonutChart
            segmentos={segmentosDist}
            centroValue={`${resumenSincronizado.total}`}
            centroLabel="Estudiantes"
            size={200}
          />
        </div>

        <div className="bg-white border border-[#ced4da] rounded p-5 space-y-4">
          <h3 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
            Extremos del Curso
          </h3>

          {mejor && (
            <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1">
              <span className="text-[10px] font-bold text-green-700 uppercase">Mejor Promedio</span>
              <div className="text-sm font-semibold text-[#212529] truncate">{mejor.Nombre}</div>
              <div className="text-xs text-green-700 font-bold">{fmt(mejor.Promedio)} pts</div>
            </div>
          )}

          {peor && (
            <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
              <span className="text-[10px] font-bold text-red-700 uppercase">Requiere Apoyo</span>
              <div className="text-sm font-semibold text-[#212529] truncate">{peor.Nombre}</div>
              <div className="text-xs text-red-700 font-bold">{fmt(peor.Promedio)} pts</div>
            </div>
          )}

          <div className="pt-3 border-t border-[#ced4da]">
            <span className="text-[10px] font-bold text-[#6c757d] uppercase block mb-2">Promedios por Evaluación</span>
            <div className="grid grid-cols-3 gap-2">
              {[['P1', evals.p1], ['P2', evals.p2], ['P3', evals.p3]].map(([k, v]) => (
                <div key={k} className="bg-[#f8f9fa] border border-[#ced4da] rounded p-2 text-center">
                  <div className="text-[10px] text-[#6c757d] uppercase">{k}</div>
                  <div className="text-sm font-bold text-[#212529]">{fmt(v as number)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Análisis */}
      <div className="bg-blue-50 border border-blue-200 rounded p-5">
        <h3 className="text-xs font-bold text-[#1177d1] uppercase tracking-wide mb-2">Análisis · {materiaActiva}</h3>
        <p className="text-sm text-[#212529] leading-relaxed">
          En <strong>{materiaActiva}</strong> se registra un <strong className="text-green-700">{fmt(resumenSincronizado.porcentajeAprobados)}%</strong> de aprobación efectiva ({resumenSincronizado.aprobados} de {resumenSincronizado.total} estudiantes), frente a un <strong className="text-red-700">{fmt(resumenSincronizado.porcentajeRiesgo)}%</strong> ({resumenSincronizado.enRiesgo} estudiantes) que requieren acompañamiento pedagógico.
        </p>
      </div>

      {/* Ranking */}
      <div className="bg-white border border-[#ced4da] rounded overflow-hidden">
        <div className="p-4 border-b border-[#ced4da] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#f8f9fa]">
          <span className="text-sm font-bold text-[#212529]">Listado General · {materiaActiva}</span>
          <div className="w-full sm:w-64">
            <SearchInput value={busqueda} onChange={onBusquedaChange} placeholder="Buscar estudiante..." />
          </div>
        </div>
        <RankingTable filas={filas} />
      </div>
    </div>
  );
}