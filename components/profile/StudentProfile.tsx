'use client';
import { useMemo, useState } from 'react';
import { ResultadoAuditoria, PerfilEstudiante } from '@/lib/types';
import {
  calcularPercentil,
  promedioClase,
  rangoPosiciones,
  detectarEscala,
  fmt,
  RubricasMateria,
  buscarRubricaPorMateria,
  enriquecerPerfilGeneral,
} from '@/lib/utils';
import { SearchInput, StatCard } from '@/components/ui';
import { MiniBar } from '@/components/DonutChart';
import { StudentMatterDetail } from '@/components/profile/StudentMatterDetail';
import { BloqueDiagnostico } from '@/components/PerfilDiagnostico';
import { DescargaPerfil } from '@/components/profile/DescargaPerfil';
import type { AnalisisHito, PerfilDiagnostico } from '@/lib/analisis-hitos';

interface Props {
  resultado: ResultadoAuditoria;
  estudianteActivo: PerfilEstudiante;
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  onSelect: (est: PerfilEstudiante) => void;
  rubricas?: Record<string, RubricasMateria>;
  /** Diagnóstico por pregunta del hito cargado desde Excel (si existe). */
  diagnostico?: { analisis: AnalisisHito; perfil: PerfilDiagnostico } | null;
}

export function StudentProfile({
  resultado,
  estudianteActivo,
  busqueda,
  onBusquedaChange,
  onSelect,
  rubricas = {},
  diagnostico = null,
}: Props) {
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

  // Las posiciones y promedios del curso solo cuentan a quienes rindieron el examen.
  const presentes = useMemo(
    () => resultado.perfilesEstudiantes.filter((e) => !e.noSePresento),
    [resultado.perfilesEstudiantes]
  );
  const rankMap = useMemo(() => rangoPosiciones(presentes), [presentes]);
  const posicion = rankMap.get(estudianteActivo.nombre) ?? 0;
  const percentil = useMemo(
    () => calcularPercentil(estudianteActivo, presentes),
    [estudianteActivo, presentes]
  );
  const promedioGrupal = useMemo(() => promedioClase(presentes), [presentes]);
  const ausente = !!estudianteActivo.noSePresento;
  const clave = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const materiasSinPresentarse = useMemo(
    () =>
      Object.entries(resultado.noPresentados ?? {})
        .filter(([, lista]) => lista.some((x) => clave(x.Nombre) === clave(estudianteActivo.nombre)))
        .map(([m]) => m),
    [resultado.noPresentados, estudianteActivo.nombre]
  );
  const diff = estudianteActivo.promedioGeneral - promedioGrupal;

  const perfilEnriquecido = useMemo(
    () => enriquecerPerfilGeneral(estudianteActivo, rubricas),
    [estudianteActivo, rubricas]
  );

  const materiaEntries = Object.entries(estudianteActivo.materias);
  const mejorMateria = [...materiaEntries].sort((a, b) => b[1].promedio - a[1].promedio)[0];
  const peorMateria = [...materiaEntries].sort((a, b) => a[1].promedio - b[1].promedio)[0];

  if (materiaDetalle) {
    return (
      <StudentMatterDetail
        resultado={resultado}
        estudiante={estudianteActivo}
        materia={materiaDetalle}
        rubricasMateria={buscarRubricaPorMateria(rubricas, materiaDetalle)}
        onVolver={() => setMateriaDetalle(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Lista de estudiantes */}
      <div className="no-imprimir lg:col-span-4 bg-white border border-[#ced4da] rounded">
        <div className="p-4 border-b border-[#ced4da] bg-[#f8f9fa] space-y-2">
          <h3 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
            Buscar Estudiante
          </h3>
          <SearchInput value={busqueda} onChange={onBusquedaChange} placeholder="Nombre o correo..." />
        </div>
        <div className="max-h-[620px] overflow-y-auto p-2 space-y-1.5">
          {estudiantesFiltrados.length > 0 ? (
            estudiantesFiltrados.map((est) => {
              const active = estudianteActivo.nombre === est.nombre;
              return (
                <div
                  key={est.nombre}
                  onClick={() => { onSelect(est); setMateriaDetalle(null); }}
                  className={`p-3 rounded cursor-pointer transition border space-y-1.5 ${
                    active
                      ? 'bg-[#1177d1] text-white border-[#1177d1]'
                      : 'bg-white text-[#212529] border-[#ced4da] hover:bg-[#f8f9fa]'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 text-xs">
                    <span className="truncate">
                      {!est.noSePresento && (
                        <><span className={active ? 'text-white/70' : 'text-[#6c757d]'}>#{rankMap.get(est.nombre)}</span>{' '}</>
                      )}
                      <span className="font-semibold">{est.nombre}</span>
                    </span>
                    {est.noSePresento ? (
                      <span className={`shrink-0 text-[10px] font-semibold ${active ? 'text-white' : 'text-[#6c757d]'}`}>No se presentó</span>
                    ) : (
                      <span className="font-bold shrink-0">{fmt(est.promedioGeneral)}</span>
                    )}
                  </div>
                  {!est.noSePresento && <MiniBar
                    value={est.promedioGeneral}
                    max={scaleMax}
                    tone={est.promedioGeneral >= umbralAprobado ? 'emerald' : 'rose'}
                  />}
                </div>
              );
            })
          ) : (
            <div className="text-xs text-[#6c757d] py-6 text-center">No encontrado.</div>
          )}
        </div>
      </div>

      {/* Perfil del estudiante */}
      <div className="lg:col-span-8 min-w-0 space-y-6">
        <div className="bg-white border border-[#ced4da] rounded">
          {/* Header del estudiante */}
          <div className="p-6 border-b border-[#ced4da] bg-[#f8f9fa]">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#1177d1] flex items-center justify-center text-white font-bold text-lg">
                  {estudianteActivo.nombre.charAt(0)}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#6c757d] uppercase">Expediente Académico</span>
                  <h2 className="text-xl font-bold text-[#212529] break-words">{estudianteActivo.nombre}</h2>
                  <p className="text-xs text-[#6c757d] break-all">{estudianteActivo.correo}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-[#6c757d] uppercase block">Promedio General</span>
                  {ausente ? (
                    <span className="text-base font-bold text-[#6c757d]">No se presentó</span>
                  ) : (
                    <span className="text-2xl font-bold text-[#1177d1]">{fmt(estudianteActivo.promedioGeneral)} pts</span>
                  )}
                </div>
                <DescargaPerfil
                  resultado={resultado}
                  estudiante={estudianteActivo}
                  posicion={ausente ? null : { puesto: posicion, total: presentes.length }}
                  promedioCurso={promedioGrupal}
                  materiasSinPresentarse={materiasSinPresentarse}
                  diagnostico={diagnostico}
                />
              </div>
            </div>
          </div>

          {ausente ? (
            <div className="p-6">
              <div className="rounded border border-amber-300 bg-amber-50 p-5 space-y-1">
                <h4 className="text-sm font-bold text-amber-900">No se presentó al examen</h4>
                <p className="text-sm text-[#212529]">
                  Figura en la lista del curso, pero no tiene ninguna nota registrada en este hito. No se calcula su posición ni su
                  diagnóstico, y no se cuenta en los promedios del curso.
                </p>
              </div>
            </div>
          ) : (
          <div className="p-6 space-y-6">
            {materiasSinPresentarse.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-[#212529]">
                <strong className="text-amber-900">No se presentó al examen en:</strong> {materiasSinPresentarse.join(', ')}.
              </div>
            )}
            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Posición" value={`#${posicion} / ${presentes.length}`} />
              <StatCard label="Percentil" value={`P${Math.round(percentil)}`} />
              <StatCard label="Vs Curso" value={`${diff >= 0 ? '+' : ''}${fmt(diff)} pts`} tone={diff >= 0 ? 'positive' : 'negative'} />
              <StatCard label="Promedio Curso" value={`${fmt(promedioGrupal)} pts`} />
            </div>

            {/* Mejor / peor materia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mejorMateria && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <span className="text-[10px] font-bold text-green-800 uppercase block">Materia Más Fuerte</span>
                  <div className="text-sm font-bold text-[#212529] mt-1">{mejorMateria[0]}</div>
                  <div className="text-xs text-green-700 font-semibold">{fmt(mejorMateria[1].promedio)} pts</div>
                </div>
              )}
              {peorMateria && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <span className="text-[10px] font-bold text-red-800 uppercase block">Materia Más Débil</span>
                  <div className="text-sm font-bold text-[#212529] mt-1">{peorMateria[0]}</div>
                  <div className="text-xs text-red-700 font-semibold">{fmt(peorMateria[1].promedio)} pts</div>
                </div>
              )}
            </div>

            {/* Fortalezas / debilidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded p-5 space-y-2">
                <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">Puntos Fuertes</h4>
                <ul className="list-disc list-inside text-sm text-[#212529] space-y-1.5">
                  {perfilEnriquecido.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
                  {perfilEnriquecido.fortalezas.length === 0 && (
                    <li className="text-[#6c757d] list-none">Sin fortalezas registradas.</li>
                  )}
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-5 space-y-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Áreas de Mejora</h4>
                <ul className="list-disc list-inside text-sm text-[#212529] space-y-1.5">
                  {perfilEnriquecido.debilidades.map((d, i) => <li key={i}>{d}</li>)}
                  {perfilEnriquecido.debilidades.length === 0 && (
                    <li className="text-[#6c757d] list-none">Sin debilidades registradas.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Consecuencias */}
            <div className="bg-blue-50 border border-blue-200 rounded p-5 space-y-2">
              <h4 className="text-xs font-bold text-[#1177d1] uppercase tracking-wide">Consecuencias en la Carrera</h4>
              <p className="text-sm text-[#212529] leading-relaxed">
                {perfilEnriquecido.consecuencias || 'Sin observaciones.'}
              </p>
            </div>

            {/* Diagnóstico por pregunta (Excel del hito) */}
            {diagnostico && <BloqueDiagnostico analisis={diagnostico.analisis} perfil={diagnostico.perfil} />}

            {/* Desglose por materia */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-[#212529] uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#1177d1] rounded" />
                  Desglose por Materia
                </h4>
                <span className="text-[10px] text-[#6c757d]">clic para detalle</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {materiaEntries.map(([mat, data]) => {
                  const filas = resultado.datosMaterias[mat] || [];
                  const promedioMat = filas.length ? filas.reduce((a, f) => a + f.Promedio, 0) / filas.length : 0;
                  const diffMat = data.promedio - promedioMat;
                  const pos = filas.filter((f) => f.Promedio > data.promedio).length + 1;
                  const tieneRubrica = Boolean(buscarRubricaPorMateria(rubricas, mat));
                  return (
                    <button
                      key={mat}
                      onClick={() => setMateriaDetalle(mat)}
                      className="text-left bg-white border border-[#ced4da] hover:border-[#1177d1] p-4 rounded space-y-2 transition w-full"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[#212529] font-bold text-sm">{mat}</span>
                          {tieneRubrica && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1177d1] border border-blue-200">
                              Con temario
                            </span>
                          )}
                        </div>
                        <span className="text-[#1177d1] font-bold text-sm">{fmt(data.promedio)} pts</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#6c757d]">
                        <span>
                          {data.p1 === null && data.p2 === null && data.p3 === null
                            ? 'Nota final de la materia'
                            : `P1: ${fmt(data.p1)} · P2: ${fmt(data.p2)} · P3: ${fmt(data.p3)}`}
                        </span>
                        <span>Posición #{pos} / {filas.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#6c757d]">Curso: {fmt(promedioMat)} pts</span>
                        <span className={diffMat >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {diffMat >= 0 ? '+' : ''}{fmt(diffMat)} pts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}