'use client';
import { useMemo } from 'react';
import { ResultadoAuditoria, PerfilEstudiante } from '@/lib/types';
import { analizarEstudianteEnMateria, calcularDistribucion, fmt, ordenarPorPromedio } from '@/lib/utils';
import { StatCard } from '@/components/ui';
import { DonutChart } from '@/components/DonutChart';

interface Props {
  resultado: ResultadoAuditoria;
  estudiante: PerfilEstudiante;
  materia: string;
  onVolver: () => void;
}

const COLORES_RANGO = ['#b91c1c', '#ea580c', '#f59e0b', '#1177d1', '#15803d'];

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
      <div className="bg-white border border-[#ced4da] rounded p-8 text-center space-y-4">
        <p className="text-[#6c757d] text-sm">Sin datos suficientes para esta materia.</p>
        <button onClick={onVolver} className="px-4 py-2 rounded bg-[#1177d1] text-white text-xs hover:bg-[#0d62b0] transition-colors">
          ← Volver al perfil general
        </button>
      </div>
    );
  }

  const a = analisis;
  const diffColor = a.diffVsCurso >= 0 ? 'text-green-700' : 'text-red-700';
  const tendenciaColor = a.tendencia > 1 ? 'text-green-700' : a.tendencia < -1 ? 'text-red-700' : 'text-amber-700';

  const segmentosDist = distribucion.map((r, i) => ({
    label: r.label,
    value: r.count,
    color: COLORES_RANGO[i] ?? '#6c757d',
  }));

  return (
    <div className="space-y-6">
      <button
        onClick={onVolver}
        className="px-4 py-2 rounded bg-white border border-[#ced4da] text-[#212529] text-xs hover:bg-[#f8f9fa] transition-colors"
      >
        ← Volver al perfil general de {estudiante.nombre}
      </button>

      {/* Header */}
      <div className="bg-white border border-[#ced4da] rounded">
        <div className="p-6 border-b border-[#ced4da] bg-[#f8f9fa]">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-[#1177d1] flex items-center justify-center text-white font-bold text-lg">
                {estudiante.nombre.charAt(0)}
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#6c757d] uppercase">Perfil Materia × Estudiante</span>
                <h2 className="text-xl font-bold text-[#212529]">{estudiante.nombre}</h2>
                <p className="text-xs text-[#6c757d]">{estudiante.correo}</p>
                <p className="text-sm text-[#212529] mt-1">Materia: <strong className="text-[#1177d1]">{materia}</strong></p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-[#6c757d] uppercase block">Promedio en esta materia</span>
              <span className="text-2xl font-bold text-[#1177d1]">{fmt(a.evaluaciones.promedio)} pts</span>
              <span className={`block text-xs font-semibold mt-1 ${diffColor}`}>
                {a.diffVsCurso >= 0 ? '+' : ''}{fmt(a.diffVsCurso)} vs curso
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Posición en la materia" value={`#${a.posicion} / ${a.total}`} />
            <StatCard label="Percentil" value={`P${Math.round(a.percentil)}`} />
            <StatCard label="Promedio del curso" value={`${fmt(a.promedioCurso)} pts`} />
            <StatCard label="Tendencia personal" value={a.tendenciaLabel} />
          </div>

          {/* Diagnóstico + proyección */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-5 rounded space-y-2">
              <h4 className="text-xs font-bold text-[#1177d1] uppercase tracking-wide">Diagnóstico en {materia}</h4>
              <p className="text-sm text-[#212529] leading-relaxed">{a.diagnostico}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-5 rounded space-y-2">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Proyección al Próximo Hito</h4>
              <p className="text-sm text-[#212529] leading-relaxed">{a.proyeccion}</p>
              <p className={`text-xs font-semibold ${tendenciaColor}`}>
                Tendencia: {a.tendencia >= 0 ? '+' : ''}{fmt(a.tendencia)} pts (tú) · {a.tendenciaCurso >= 0 ? '+' : ''}{fmt(a.tendenciaCurso)} pts (curso)
              </p>
            </div>
          </div>

          {/* Donas por evaluación */}
          <div className="bg-white border border-[#ced4da] rounded p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
              Comparativo por Evaluación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['P1', 'P2', 'P3'] as const).map((pName) => {
                const key = pName.toLowerCase() as 'p1' | 'p2' | 'p3';
                const tuyo = a.evaluaciones[key];
                const curso = a.promediosCurso[key];
                const diff = tuyo - curso;
                const maxEscala = curso > 20 ? 100 : 20;
                const segmentosEval = [
                  { label: 'Estudiante', value: tuyo, color: '#1177d1' },
                  { label: 'Resto del curso', value: Math.max(curso - tuyo, 0), color: '#6c757d' },
                  { label: 'Margen', value: Math.max(maxEscala - curso, 0), color: '#e9ecef' },
                ];
                return (
                  <div key={pName} className="bg-[#f8f9fa] border border-[#ced4da] rounded p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-[#1177d1]">{pName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        diff >= 1 ? 'bg-green-50 text-green-700 border-green-200'
                        : diff <= -1 ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {diff >= 1 ? 'Supera' : diff <= -1 ? 'Por debajo' : 'Alineado'}
                      </span>
                    </div>
                    <DonutChart segmentos={segmentosEval} centroValue={fmt(tuyo)} centroLabel="Tú" size={140} thickness={20} />
                    <div className="text-center text-[11px] text-[#6c757d]">
                      Curso: <strong className="text-[#212529]">{fmt(curso)}</strong> · Diferencia:{' '}
                      <strong className={diff >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribución general + resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#ced4da] rounded p-5">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2 mb-4">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Distribución del Curso
              </h4>
              <DonutChart segmentos={segmentosDist} centroValue={`${filas.length}`} centroLabel="Estudiantes" size={180} />
            </div>

            <div className="bg-white border border-[#ced4da] rounded p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                Resumen Comparativo
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {(['p1', 'p2', 'p3'] as const).map((k) => {
                  const tuyo = a.evaluaciones[k];
                  const curso = a.promediosCurso[k];
                  const diff = tuyo - curso;
                  return (
                    <div key={k} className="bg-[#f8f9fa] border border-[#ced4da] rounded p-3 text-center">
                      <div className="text-[10px] text-[#6c757d] uppercase font-bold">{k.toUpperCase()}</div>
                      <div className="text-lg font-bold text-[#212529] mt-1">{fmt(tuyo)}</div>
                      <div className="text-[10px] text-[#6c757d]">curso: {fmt(curso)}</div>
                      <div className={`text-[10px] font-bold mt-1 ${diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fortalezas y debilidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">Fortalezas en {materia}</h4>
              <ul className="list-disc list-inside text-sm text-[#212529] space-y-1">
                {a.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Debilidades en {materia}</h4>
              <ul className="list-disc list-inside text-sm text-[#212529] space-y-1">
                {a.debilidades.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>

          {/* Plan de acción */}
          <div className="bg-red-50 border border-red-200 rounded p-5 space-y-2">
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Plan de Acción para {materia}</h4>
            <ul className="list-disc list-inside text-sm text-[#212529] space-y-1">
              {a.planAccion.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          {/* Top 3 */}
          <div className="bg-white border border-[#ced4da] rounded p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded" />
              Top 3 del Curso en {materia}
            </h4>
            <div className="space-y-1">
              {topCurso.map((f, i) => (
                <div key={f.Nombre} className="flex justify-between items-center text-sm py-2 border-b border-[#e9ecef] last:border-0">
                  <span className="text-[#212529]">
                    <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold text-center leading-6 mr-2 ${
                      i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-800'
                    }`}>{i + 1}</span>
                    {f.Nombre}
                    {f.Nombre === estudiante.nombre && <span className="text-[#1177d1] font-semibold ml-2">← tú</span>}
                  </span>
                  <span className="text-[#1177d1] font-bold">{fmt(f.Promedio)} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Otras materias */}
          <div className="bg-white border border-[#ced4da] rounded p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
              Cómo rindes en tus otras materias (vs {materia})
            </h4>
            <div className="space-y-1">
              {a.otrasMaterias.length > 0 ? a.otrasMaterias.map((m) => (
                <div key={m.materia} className="flex justify-between items-center text-sm py-2 border-b border-[#e9ecef] last:border-0">
                  <span className="text-[#212529]">{m.materia}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#212529] font-semibold">{fmt(m.promedio)} pts</span>
                    <span className={`text-[10px] font-semibold ${m.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {m.diff >= 0 ? '+' : ''}{fmt(m.diff)} vs {materia}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-[#6c757d] text-sm">Este estudiante solo tiene registrada esta materia.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}