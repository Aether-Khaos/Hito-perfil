'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria } from '@/lib/types';
import {
  filtrarFilas, ordenarPorPromedio, calcularDistribucion,
  promediosEvaluaciones, fmt,
} from '@/lib/utils';
import { SearchInput, StatCard } from '@/components/ui';
import { DonutChart } from '@/components/DonutChart';
import { RankingTable } from '@/components/tables';

interface Props {
  resultado: ResultadoAuditoria;
  materiaActiva: string;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
}

const COLORES_RANGO = ['#b91c1c', '#ea580c', '#f59e0b', '#1177d1', '#15803d'];

export function MatterProfile({ resultado, materiaActiva, busqueda, onBusquedaChange }: Props) {
  const stats = resultado.estadisticasMaterias[materiaActiva];
  const filasBase = resultado.datosMaterias[materiaActiva] || [];

  const filas = useMemo(() => ordenarPorPromedio(filtrarFilas(filasBase, busqueda)), [filasBase, busqueda]);
  const distribucion = useMemo(() => calcularDistribucion(filasBase), [filasBase]);
  const evals = useMemo(() => promediosEvaluaciones(filasBase), [filasBase]);

  if (!stats) return null;

  const tendencia = evals.p3 - evals.p1;
  const tendenciaLabel = tendencia > 2 ? 'Mejora sostenida' : tendencia < -2 ? 'Retroceso progresivo' : 'Rendimiento estable';
  const tendenciaColor = tendencia > 2 ? 'text-green-700' : tendencia < -2 ? 'text-red-700' : 'text-amber-700';
  const tendenciaBg = tendencia > 2 ? 'bg-green-50 border-green-200' : tendencia < -2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';

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
              <span className="text-2xl font-bold text-[#1177d1]">{fmt(stats.promedioGeneral)} pts</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={`${stats.total}`} />
            <StatCard label="Aprobados" value={`${stats.aprobados}`} tone="positive" />
            <StatCard label="En Riesgo" value={`${stats.enRiesgo}`} tone="negative" />
            <div className={`rounded border p-4 ${tendenciaBg}`}>
              <p className="text-[10px] font-bold uppercase text-[#6c757d]">Tendencia</p>
              <p className={`text-sm font-bold mt-1 ${tendenciaColor}`}>{tendenciaLabel}</p>
            </div>
          </div>

          {/* Dona + comportamiento por evaluación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#ced4da] rounded p-5">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2 mb-4">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Distribución del Curso
              </h4>
              <DonutChart
                segmentos={segmentosDist}
                centroValue={`${stats.total}`}
                centroLabel="Estudiantes"
                size={180}
              />
            </div>

            <div className="bg-[#f8f9fa] border border-[#ced4da] rounded p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Comportamiento por Evaluación
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {[['P1', evals.p1], ['P2', evals.p2], ['P3', evals.p3]].map(([k, v]) => (
                  <div key={k} className="bg-white border border-[#ced4da] rounded p-3 text-center">
                    <div className="text-[10px] text-[#6c757d] uppercase font-bold">{k}</div>
                    <div className="text-lg font-bold text-[#212529]">{fmt(v as number)}</div>
                  </div>
                ))}
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
                El grupo demuestra un nivel competitivo destacable en la resolución de casos prácticos de los primeros hitos, mostrando apropiación de las bases lógicas y metodologías de desarrollo.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Debilidades Detectadas</h4>
              <p className="text-sm text-[#212529] leading-relaxed">
                Se evidencia dispersión en la aplicación de normativas avanzadas de sintaxis y manejo de errores, lo cual reduce el puntaje global en las evaluaciones P2 y P3 del hito.
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