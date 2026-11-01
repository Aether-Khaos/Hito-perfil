'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria } from '@/lib/types';
import {
  filtrarFilas, ordenarPorPromedio, calcularDistribucion,
  obtenerMejorPeor, promediosEvaluaciones, fmt,
} from '@/lib/utils';
import { StatCard, SearchInput } from '@/components/ui';
import { DistributionChart } from '@/components/charts';
import { RankingTable } from '@/components/tables';

interface Props {
  resultado: ResultadoAuditoria;
  materiaActiva: string;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
}

export function MatterDashboard({ resultado, materiaActiva, busqueda, onBusquedaChange }: Props) {
  const stats = resultado.estadisticasMaterias[materiaActiva];
  const filasBase = resultado.datosMaterias[materiaActiva] || [];

  const filas = useMemo(() => ordenarPorPromedio(filtrarFilas(filasBase, busqueda)), [filasBase, busqueda]);
  const distribucion = useMemo(() => calcularDistribucion(filasBase), [filasBase]);
  const { mejor, peor } = useMemo(() => obtenerMejorPeor(filasBase), [filasBase]);
  const evals = useMemo(() => promediosEvaluaciones(filasBase), [filasBase]);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <StatCard label="Total Evaluados" value={`${stats.total} estudiantes`} />
        <StatCard label="Promedio de la Materia" value={`${fmt(stats.promedioGeneral)} pts`} tone="cyan" />
        <StatCard label={`Aprobados (${stats.aprobados})`} value={`${fmt(stats.porcentajeAprobados)}%`} tone="emerald" />
        <StatCard label={`En Riesgo (${stats.enRiesgo})`} value={`${fmt(stats.porcentajeRiesgo)}%`} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DistributionChart rangos={distribucion} total={filasBase.length} />
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg font-mono">
          <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Extremos del Curso</h4>
          {mejor && (
            <div className="space-y-1">
              <span className="text-emerald-400 text-[10px] uppercase">Mejor Promedio</span>
              <div className="text-white text-sm font-bold truncate">{mejor.Nombre}</div>
              <div className="text-amber-400 text-xs">{fmt(mejor.Promedio)} pts</div>
            </div>
          )}
          {peor && (
            <div className="space-y-1 pt-3 border-t border-slate-800">
              <span className="text-rose-400 text-[10px] uppercase">Requiere Apoyo</span>
              <div className="text-white text-sm font-bold truncate">{peor.Nombre}</div>
              <div className="text-rose-400 text-xs">{fmt(peor.Promedio)} pts</div>
            </div>
          )}
          <div className="space-y-1 pt-3 border-t border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase">Promedios por Evaluación</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><span className="text-slate-500 block">P1</span><span className="text-slate-200">{fmt(evals.p1)}</span></div>
              <div><span className="text-slate-500 block">P2</span><span className="text-slate-200">{fmt(evals.p2)}</span></div>
              <div><span className="text-slate-500 block">P3</span><span className="text-slate-200">{fmt(evals.p3)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-3 shadow-lg">
        <h3 className="text-cyan-400 font-bold text-sm uppercase">Análisis Dashboard: {materiaActiva}</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          En <strong>{materiaActiva}</strong> se registra un <strong>{fmt(stats.porcentajeAprobados)}%</strong> de aprobación efectiva, frente a un <strong>{fmt(stats.porcentajeRiesgo)}%</strong> de alumnos que requieren acompañamiento pedagógico urgente.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-[#09101a] border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-cyan-400 font-bold font-mono">
            Listado General - {materiaActiva} (Del Mejor al Peor)
          </span>
          <SearchInput value={busqueda} onChange={onBusquedaChange} placeholder="Buscar estudiante..." />
        </div>
        <RankingTable filas={filas} />
      </div>
    </div>
  );
}
