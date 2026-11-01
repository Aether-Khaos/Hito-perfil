'use client';
import { useMemo, useState } from 'react';
import { ResultadoAuditoria, PerfilEstudiante } from '@/lib/types';
import {
  calcularPercentil, promedioClase, rangoPosiciones, detectarEscala, fmt,
} from '@/lib/utils';
import { SearchInput, StatCard } from '@/components/ui';
import { MiniBar } from '@/components/charts';
import { StudentMatterDetail } from '@/components/profile/StudentMatterDetail';

interface Props {
  resultado: ResultadoAuditoria;
  estudianteActivo: PerfilEstudiante;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  onSelect: (est: PerfilEstudiante) => void;
}

export function StudentProfile({ resultado, estudianteActivo, busqueda, onBusquedaChange, onSelect }: Props) {
  const [materiaDetalle, setMateriaDetalle] = useState<string | null>(null);

  const todasLasFilas = useMemo(
    () => Object.values(resultado.datosMaterias).flat(),
    [resultado.datosMaterias]
  );
  const scaleMax = useMemo(
    () => detectarEscala(todasLasFilas, resultado.perfilesEstudiantes.map((e) => e.promedioGeneral)),
    [todasLasFilas, resultado.perfilesEstudiantes]
  );
  const umbralAprobado = scaleMax * 0.6;

  const estudiantesFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return resultado.perfilesEstudiantes;
    return resultado.perfilesEstudiantes.filter(
      (e) => e.nombre.toLowerCase().includes(t) || e.correo.toLowerCase().includes(t)
    );
  }, [resultado.perfilesEstudiantes, busqueda]);

  const rankMap = useMemo(() => rangoPosiciones(resultado.perfilesEstudiantes), [resultado.perfilesEstudiantes]);
  const posicion = rankMap.get(estudianteActivo.nombre) ?? 0;
  const percentil = useMemo(
    () => calcularPercentil(estudianteActivo, resultado.perfilesEstudiantes),
    [estudianteActivo, resultado.perfilesEstudiantes]
  );
  const promedioGrupal = useMemo(
    () => promedioClase(resultado.perfilesEstudiantes),
    [resultado.perfilesEstudiantes]
  );
  const diff = estudianteActivo.promedioGeneral - promedioGrupal;

  const materiaEntries = Object.entries(estudianteActivo.materias);
  const mejorMateria = [...materiaEntries].sort((a, b) => b[1].promedio - a[1].promedio)[0];
  const peorMateria = [...materiaEntries].sort((a, b) => a[1].promedio - b[1].promedio)[0];

  // Drill-down: perfil de una materia específica del estudiante
  if (materiaDetalle) {
    return (
      <StudentMatterDetail
        resultado={resultado}
        estudiante={estudianteActivo}
        materia={materiaDetalle}
        onVolver={() => setMateriaDetalle(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
      <div className="lg:col-span-4 rounded-xl bg-slate-900/50 border border-slate-800 p-4 space-y-4 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-xs text-cyan-400 uppercase tracking-widest px-1">Buscador de Estudiante</h3>
          <SearchInput
            value={busqueda}
            onChange={onBusquedaChange}
            placeholder="Buscar por nombre o correo..."
            className="sm:w-full"
          />
        </div>
        <div className="max-h-[620px] overflow-y-auto space-y-2 pr-1">
          {estudiantesFiltrados.length > 0 ? (
            estudiantesFiltrados.map((est) => {
              const active = estudianteActivo.nombre === est.nombre;
              return (
                <div
                  key={est.nombre}
                  onClick={() => { onSelect(est); setMateriaDetalle(null); }}
                  className={`p-3 rounded-lg cursor-pointer transition text-xs space-y-1.5 ${
                    active
                      ? 'bg-cyan-500/20 border border-cyan-500 text-white'
                      : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate">
                      <span className="text-slate-500 mr-2 font-bold">#{rankMap.get(est.nombre)}</span>
                      {est.nombre}
                    </span>
                    <span className="text-amber-400 font-bold shrink-0">
                      {fmt(est.promedioGeneral)} pts
                    </span>
                  </div>
                  <MiniBar
                    value={est.promedioGeneral}
                    max={scaleMax}
                    tone={est.promedioGeneral >= umbralAprobado ? 'emerald' : 'rose'}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">No encontrado.</div>
          )}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="text-xs text-cyan-400 uppercase">Expediente Académico & Perfil Extremo</span>
              <h2 className="text-2xl font-bold text-white mt-1">{estudianteActivo.nombre}</h2>
              <p className="text-xs text-slate-400">{estudianteActivo.correo}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Promedio General</span>
              <span className="text-xl font-bold text-amber-400">
                {fmt(estudianteActivo.promedioGeneral)} pts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Posición Global" value={`#${posicion} / ${resultado.perfilesEstudiantes.length}`} tone="cyan" />
            <StatCard label="Percentil" value={`P${Math.round(percentil)}`} tone="emerald" />
            <StatCard
              label="Vs Promedio Curso"
              value={`${diff >= 0 ? '+' : ''}${fmt(diff)} pts`}
              tone={diff >= 0 ? 'emerald' : 'rose'}
            />
            <StatCard label="Promedio Curso" value={`${fmt(promedioGrupal)} pts`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mejorMateria && (
              <div className="bg-slate-950/70 border border-emerald-900/60 p-4 rounded-xl">
                <span className="text-emerald-400 text-[10px] uppercase block">Materia Más Fuerte</span>
                <span className="text-white font-bold text-sm">{mejorMateria[0]}</span>
                <span className="text-emerald-400 text-xs ml-2">{fmt(mejorMateria[1].promedio)} pts</span>
              </div>
            )}
            {peorMateria && (
              <div className="bg-slate-950/70 border border-rose-900/60 p-4 rounded-xl">
                <span className="text-rose-400 text-[10px] uppercase block">Materia Más Débil</span>
                <span className="text-white font-bold text-sm">{peorMateria[0]}</span>
                <span className="text-rose-400 text-xs ml-2">{fmt(peorMateria[1].promedio)} pts</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
              <h4 className="text-cyan-400 text-xs tracking-wider uppercase">Puntos Fuertes</h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
                {estudianteActivo.perfilGeneral.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
                {estudianteActivo.perfilGeneral.fortalezas.length === 0 && (
                  <li className="text-slate-500 list-none">Sin fortalezas destacadas registradas.</li>
                )}
              </ul>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
              <h4 className="text-amber-400 text-xs tracking-wider uppercase">Áreas de Mejora</h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
                {estudianteActivo.perfilGeneral.debilidades.map((d, i) => <li key={i}>{d}</li>)}
                {estudianteActivo.perfilGeneral.debilidades.length === 0 && (
                  <li className="text-slate-500 list-none">Sin debilidades registradas.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
            <h4 className="text-rose-400 text-xs tracking-wider uppercase">
              Consecuencias en la Carrera si no se corrige
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {estudianteActivo.perfilGeneral.consecuencias || 'Sin observaciones.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="text-cyan-400 text-xs tracking-wider uppercase">
                Desglose por Materia · clic para ver perfil detallado
              </h4>
              <span className="text-[10px] text-slate-500">→ drill-down</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {materiaEntries.map(([mat, data]) => {
                const filas = resultado.datosMaterias[mat] || [];
                const promedioMat = filas.length
                  ? filas.reduce((a, f) => a + f.Promedio, 0) / filas.length
                  : 0;
                const diffMat = data.promedio - promedioMat;
                const pos = filas.filter((f) => f.Promedio > data.promedio).length + 1;
                return (
                  <button
                    key={mat}
                    onClick={() => setMateriaDetalle(mat)}
                    className="text-left bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 p-4 rounded-xl space-y-2 shadow-md transition cursor-pointer w-full"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-sm flex items-center gap-2">
                        {mat}
                        <span className="text-[10px] text-cyan-400 font-normal">→ ver perfil</span>
                      </span>
                      <span className="text-amber-400 font-bold text-sm">{fmt(data.promedio)} pts</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>P1: {fmt(data.p1)} · P2: {fmt(data.p2)} · P3: {fmt(data.p3)}</span>
                      <span className="text-slate-500">Posición #{pos} / {filas.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Promedio del curso: {fmt(promedioMat)} pts</span>
                      <span className={diffMat >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {diffMat >= 0 ? '+' : ''}{fmt(diffMat)} pts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
