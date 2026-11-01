'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria, PerfilEstudiante } from '@/lib/types';
import { analizarEstudianteEnMateria, calcularDistribucion, fmt, ordenarPorPromedio } from '@/lib/utils';
import { StatCard } from '@/components/ui';
import { DistributionChart } from '@/components/charts';

interface Props {
  resultado: ResultadoAuditoria;
  estudiante: PerfilEstudiante;
  materia: string;
  onVolver: () => void;
}

export function StudentMatterDetail({ resultado, estudiante, materia, onVolver }: Props) {
  const filas = resultado.datosMaterias[materia] || [];
  const analisis = useMemo(
    () => analizarEstudianteEnMateria(estudiante, materia, filas),
    [estudiante, materia, filas]
  );
  const distribucion = useMemo(() => calcularDistribucion(filas), [filas]);
  const topCurso = useMemo(() => ordenarPorPromedio(filas).slice(0, 3), [filas]);

  if (!analisis) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-slate-400 text-sm">Sin datos suficientes para esta materia.</p>
        <button onClick={onVolver} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs cursor-pointer">
          ← Volver al perfil general
        </button>
      </div>
    );
  }

  const a = analisis;
  const tendenciaColor = a.tendencia > 1 ? 'text-emerald-400' : a.tendencia < -1 ? 'text-rose-400' : 'text-amber-400';
  const diffColor = a.diffVsCurso >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="space-y-6 font-mono">
      <button
        onClick={onVolver}
        className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 text-xs hover:bg-slate-800 cursor-pointer transition"
      >
        ← Volver al perfil general de {estudiante.nombre}
      </button>

      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
        <div className="border-b border-slate-800 pb-4 flex justify-between items-start flex-wrap gap-4">
          <div>
            <span className="text-xs text-cyan-400 uppercase">Perfil Materia × Estudiante</span>
            <h2 className="text-2xl font-bold text-white mt-1">{estudiante.nombre}</h2>
            <p className="text-xs text-slate-400">{estudiante.correo}</p>
            <p className="text-sm text-cyan-300 mt-2">Materia: <strong>{materia}</strong></p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">Promedio en esta materia</span>
            <span className="text-2xl font-bold text-amber-400">{fmt(a.evaluaciones.promedio)} pts</span>
            <span className={`block text-xs mt-1 ${diffColor}`}>
              {a.diffVsCurso >= 0 ? '+' : ''}{fmt(a.diffVsCurso)} vs curso
            </span>
          </div>
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Posición en la materia" value={`#${a.posicion} / ${a.total}`} tone="cyan" />
        <StatCard label="Percentil dentro del curso" value={`P${Math.round(a.percentil)}`} tone="emerald" />
        <StatCard label="Promedio del curso" value={`${fmt(a.promedioCurso)} pts`} />
        <StatCard label="Tendencia personal" value={a.tendenciaLabel} tone="cyan" />
      </div>

      {/* Diagnóstico + proyección */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl space-y-3 shadow-lg">
          <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Diagnóstico en {materia}</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">{a.diagnostico}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl space-y-3 shadow-lg">
          <h4 className="text-amber-400 text-xs tracking-wider uppercase font-bold">Proyección al Próximo Hito</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">{a.proyeccion}</p>
          <p className={`text-xs ${tendenciaColor} font-bold`}>
            Tendencia: {a.tendencia >= 0 ? '+' : ''}{fmt(a.tendencia)} pts (tú) · {a.tendenciaCurso >= 0 ? '+' : ''}{fmt(a.tendenciaCurso)} pts (curso)
          </p>
        </div>
      </div>

      {/* Análisis evaluación por evaluación */}
      <div className="bg-slate-900/70 border border-slate-800 p-6 sm:p-8 rounded-xl space-y-5 shadow-2xl">
        <h3 className="text-cyan-400 font-bold text-sm uppercase">Análisis Detallado por Evaluación</h3>

        {(['P1', 'P2', 'P3'] as const).map((pName) => {
          const key = pName.toLowerCase() as 'p1' | 'p2' | 'p3';
          const tuyo = a.evaluaciones[key];
          const curso = a.promediosCurso[key];
          const diff = tuyo - curso;
          const explicacion = pName === 'P1' ? a.explicacionP1 : pName === 'P2' ? a.explicacionP2 : a.explicacionP3;
          return (
            <div key={pName} className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-cyan-400 font-bold text-sm">{pName}</span>
                <span className="text-slate-300 text-xs">
                  Tú: <strong className="text-amber-400">{fmt(tuyo)} pts</strong> · Curso: {fmt(curso)} pts ·{' '}
                  <span className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {diff >= 0 ? '+' : ''}{fmt(diff)} pts
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{explicacion}</p>
              <div className="flex gap-3 text-[11px]">
                <div className="flex-1 bg-slate-900/60 rounded-lg p-2">
                  <span className="text-slate-500 block text-[10px]">Tu nota</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-950 rounded overflow-hidden">
                      <div className="h-full bg-amber-500/70" style={{ width: `${Math.min((tuyo / (curso > 20 ? 100 : 20)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-amber-400 font-bold">{fmt(tuyo)}</span>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900/60 rounded-lg p-2">
                  <span className="text-slate-500 block text-[10px]">Promedio curso</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-950 rounded overflow-hidden">
                      <div className="h-full bg-cyan-500/70" style={{ width: `${Math.min((curso / (curso > 20 ? 100 : 20)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-cyan-400 font-bold">{fmt(curso)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribución + Tú vs Curso resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionChart rangos={distribucion} total={filas.length} />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
          <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Resumen Comparativo</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(['p1', 'p2', 'p3'] as const).map((k) => {
              const label = k.toUpperCase();
              const tuyo = a.evaluaciones[k];
              const curso = a.promediosCurso[k];
              const diff = tuyo - curso;
              return (
                <div key={k} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">{label}</div>
                  <div className="text-lg font-bold text-amber-400">{fmt(tuyo)}</div>
                  <div className="text-[10px] text-slate-500">curso: {fmt(curso)}</div>
                  <div className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {diff >= 0 ? '+' : ''}{fmt(diff)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fortalezas y debilidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
          <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Fortalezas Reales en {materia}</h4>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
            {a.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
          <h4 className="text-amber-400 text-xs tracking-wider uppercase font-bold">Debilidades Reales en {materia}</h4>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
            {a.debilidades.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      </div>

      {/* Plan de acción */}
      <div className="bg-slate-950/70 border border-rose-900/40 p-5 rounded-xl space-y-3 shadow-md">
        <h4 className="text-rose-400 text-xs tracking-wider uppercase font-bold">Plan de Acción para {materia}</h4>
        <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
          {a.planAccion.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      {/* Top 3 del curso */}
      <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
        <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Top 3 del Curso en {materia}</h4>
        <div className="space-y-2">
          {topCurso.map((f, i) => (
            <div key={f.Nombre} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-900 last:border-0">
              <span className="text-slate-400">
                <span className="text-cyan-400 font-bold mr-2">#{i + 1}</span>
                {f.Nombre}
                {f.Nombre === estudiante.nombre && <span className="text-emerald-400 ml-2">← tú</span>}
              </span>
              <span className="text-amber-400 font-bold">{fmt(f.Promedio)} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Otras materias */}
      <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
        <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">
          Cómo rindes en tus otras materias (vs {materia})
        </h4>
        <div className="space-y-2">
          {a.otrasMaterias.length > 0 ? a.otrasMaterias.map((m) => (
            <div key={m.materia} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-900 last:border-0">
              <span className="text-slate-400">{m.materia}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-300">{fmt(m.promedio)} pts</span>
                <span className={`text-[10px] ${m.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.diff >= 0 ? '+' : ''}{fmt(m.diff)} vs {materia}
                </span>
              </div>
            </div>
          )) : (
            <p className="text-slate-500 text-xs">Este estudiante solo tiene registrada esta materia.</p>
          )}
        </div>
      </div>
    </div>
  );
}
