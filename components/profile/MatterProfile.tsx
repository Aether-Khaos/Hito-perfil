'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria } from '@/lib/types';
import {
  filtrarFilas, ordenarPorPromedio, calcularDistribucion,
  promediosEvaluaciones, fmt,
} from '@/lib/utils';
import { SearchInput, StatCard } from '@/components/ui';
import { DistributionChart } from '@/components/charts';
import { RankingTable } from '@/components/tables';

interface Props {
  resultado: ResultadoAuditoria;
  materiaActiva: string;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
}

export function MatterProfile({ resultado, materiaActiva, busqueda, onBusquedaChange }: Props) {
  const stats = resultado.estadisticasMaterias[materiaActiva];
  const filasBase = resultado.datosMaterias[materiaActiva] || [];

  const filas = useMemo(() => ordenarPorPromedio(filtrarFilas(filasBase, busqueda)), [filasBase, busqueda]);
  const distribucion = useMemo(() => calcularDistribucion(filasBase), [filasBase]);
  const evals = useMemo(() => promediosEvaluaciones(filasBase), [filasBase]);

  if (!stats) return null;

  const tendencia = evals.p3 - evals.p1;
  const tendenciaLabel = tendencia > 2 ? 'Mejora sostenida' : tendencia < -2 ? 'Retroceso progresivo' : 'Rendimiento estable';
  const tendenciaColor = tendencia > 2 ? 'text-emerald-400' : tendencia < -2 ? 'text-rose-400' : 'text-amber-400';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 p-6 sm:p-8 rounded-xl space-y-6 shadow-2xl font-mono">
        <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
          <div>
            <span className="text-xs text-cyan-400 uppercase">Perfil Académico Consolidado</span>
            <h2 className="text-2xl font-bold text-white mt-1">Materia: {materiaActiva}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Promedio General</span>
            <span className="text-xl font-bold text-amber-400">{fmt(stats.promedioGeneral)} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={`${stats.total}`} />
          <StatCard label="Aprobados" value={`${stats.aprobados}`} tone="emerald" />
          <StatCard label="En Riesgo" value={`${stats.enRiesgo}`} tone="rose" />
          <StatCard label="Tendencia" value={tendenciaLabel} tone="cyan" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DistributionChart rangos={distribucion} total={filasBase.length} />
          <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md font-mono">
            <h4 className="text-cyan-400 text-xs tracking-wider uppercase">Comportamiento por Evaluación</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              {([['P1', evals.p1], ['P2', evals.p2], ['P3', evals.p3]] as const).map(([k, v]) => (
                <div key={k} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">{k}</div>
                  <div className="text-lg font-bold text-amber-400">{fmt(v)}</div>
                </div>
              ))}
            </div>
            <p className={`text-xs ${tendenciaColor}`}>
              {tendenciaLabel} ({tendencia >= 0 ? '+' : ''}{fmt(tendencia)} pts entre P1 y P3)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
            <h4 className="text-cyan-400 text-xs tracking-wider uppercase">Fortalezas del Curso</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              El grupo demuestra un nivel competitivo destacable en la resolución de casos prácticos de los primeros hitos, mostrando apropiación de las bases lógicas y metodologías de desarrollo.
            </p>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
            <h4 className="text-amber-400 text-xs tracking-wider uppercase">Debilidades y Vacíos Detectados</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Se evidencia dispersión en la aplicación de normativas avanzadas de sintaxis y manejo de errores, lo cual reduce el puntaje global en las evaluaciones P2 y P3 del hito.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-[#09101a] border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-cyan-400 font-bold font-mono">
            Ranking Estudiantil - {materiaActiva} (Del Mejor al Peor)
          </span>
          <SearchInput value={busqueda} onChange={onBusquedaChange} placeholder="Buscar alumno en esta materia..." />
        </div>
        <RankingTable filas={filas} showCorreo={false} />
      </div>
    </div>
  );
}
