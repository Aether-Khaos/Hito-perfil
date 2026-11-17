'use client';

import { useState, useEffect, useMemo } from 'react';
import { DonutChart } from '@/components/DonutChart';

interface PorMateria {
  promedio: number;
  p1: number;
  p2: number;
  p3: number;
}
interface PuntoHito {
  nivel: string;
  p1: number;
  p2: number;
  p3: number;
  promedio: number;
  porMateria: Record<string, PorMateria>;
}
interface EstudianteProgresion {
  nombre: string;
  correo: string;
  progresion: PuntoHito[];
  promedioConsolidado: number;
  tendencia: number;
  tendenciaLabel: string;
}

export default function Progresion() {
  const [anios, setAnios] = useState<string[]>([]);
  const [anio, setAnio] = useState('');
  const [hitosDisponibles, setHitosDisponibles] = useState<string[]>([]);
  const [hitoSeleccionado, setHitoSeleccionado] = useState<string>('TODOS');
  const [materias, setMaterias] = useState<string[]>([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string>('TODAS');
  const [estudiantes, setEstudiantes] = useState<EstudianteProgresion[]>([]);
  const [estudianteActivo, setEstudianteActivo] = useState<EstudianteProgresion | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async (anioFiltro: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (anioFiltro) params.set('anio', anioFiltro);
      const res = await fetch(`/api/progresion?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setEstudiantes([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        const hitos: string[] = data.hitosDisponibles || [];
        setAnios(data.anios || []);
        setHitosDisponibles(hitos);
        setHitoSeleccionado(hitos.length === 1 ? hitos[0] : 'TODOS');
        setMaterias(data.materias || []);
        setMateriaSeleccionada('TODAS');
        setEstudiantes(data.estudiantes || []);
        setEstudianteActivo(data.estudiantes?.[0] ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar('');
  }, []);

  const escalaMax = useMemo(() => {
    if (materias.length === 0) return 100;
    const maxVal = Math.max(
      0,
      ...estudiantes.flatMap((e) =>
        e.progresion.flatMap((p) => [
          p.promedio,
          ...Object.values(p.porMateria).map((m) => m.promedio),
        ])
      )
    );
    return maxVal > 20 ? 100 : 20;
  }, [estudiantes, materias]);

  const notaMinimaAprobacion = escalaMax > 20 ? 51 : 11;

  const estudiantesProcesados = useMemo(() => {
    return estudiantes
      .map((est) => {
        const hitosEst =
          hitoSeleccionado === 'TODOS'
            ? est.progresion
            : est.progresion.filter((p) => p.nivel === hitoSeleccionado);

        if (hitosEst.length === 0) return null;

        const notasPorMateriaMap: Record<string, number[]> = {};
        for (const h of hitosEst) {
          for (const [mat, datos] of Object.entries(h.porMateria)) {
            if (materiaSeleccionada !== 'TODAS' && mat !== materiaSeleccionada) continue;
            if (!notasPorMateriaMap[mat]) notasPorMateriaMap[mat] = [];
            notasPorMateriaMap[mat].push(datos.promedio);
          }
        }

        const materiasConsolidado = Object.entries(notasPorMateriaMap).map(([mat, vals]) => ({
          materia: mat,
          promedio: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
        }));

        if (materiasConsolidado.length === 0) return null;

        const promedioActivo = Number(
          (
            materiasConsolidado.reduce((a, m) => a + m.promedio, 0) /
            materiasConsolidado.length
          ).toFixed(1)
        );

        const aprobadas = materiasConsolidado.filter(
          (m) => m.promedio >= notaMinimaAprobacion
        ).length;
        const reprobadas = materiasConsolidado.length - aprobadas;

        const bienEnTodas = reprobadas === 0;
        const malEnTodas = aprobadas === 0;

        return {
          ...est,
          promedioActivo,
          materiasConsolidado,
          aprobadas,
          reprobadas,
          bienEnTodas,
          malEnTodas,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.promedioActivo - a.promedioActivo);
  }, [estudiantes, hitoSeleccionado, materiaSeleccionada, notaMinimaAprobacion]);

  const resumenCurso = useMemo(() => {
    const total = estudiantesProcesados.length;
    const bienTodas = estudiantesProcesados.filter((e) => e.bienEnTodas).length;
    const malTodas = estudiantesProcesados.filter((e) => e.malEnTodas).length;
    const mixto = total - bienTodas - malTodas;
    const promedioEstandar =
      total > 0
        ? Number(
            (
              estudiantesProcesados.reduce((acc, e) => acc + e.promedioActivo, 0) / total
            ).toFixed(1)
          )
        : 0;

    return { total, bienTodas, malTodas, mixto, promedioEstandar };
  }, [estudiantesProcesados]);

  const estudianteSeleccionado = useMemo(() => {
    if (estudiantesProcesados.length === 0) return null;
    if (!estudianteActivo) return estudiantesProcesados[0];
    return (
      estudiantesProcesados.find((e) => e.nombre === estudianteActivo.nombre) ??
      estudiantesProcesados[0]
    );
  }, [estudiantesProcesados, estudianteActivo]);

  const filtradosLista = estudiantesProcesados.filter((e) => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return true;
    return e.nombre.toLowerCase().includes(t) || e.correo.toLowerCase().includes(t);
  });

  const etiquetaHito =
    hitoSeleccionado === 'TODOS'
      ? hitosDisponibles.length === 1
        ? `Hito ${hitosDisponibles[0]}`
        : `Todos los hitos (${hitosDisponibles.join(' · ')})`
      : `Hito ${hitoSeleccionado}`;

  const segmentosCurso =
    materiaSeleccionada === 'TODAS'
      ? [
          { label: 'Bien en todas las áreas', value: resumenCurso.bienTodas, color: '#15803d' },
          { label: 'Con áreas en riesgo', value: resumenCurso.mixto, color: '#f59e0b' },
          { label: 'Mal en todas las áreas', value: resumenCurso.malTodas, color: '#b91c1c' },
        ]
      : [
          { label: `Aprobados (${materiaSeleccionada})`, value: resumenCurso.bienTodas, color: '#15803d' },
          { label: `Reprobados (${materiaSeleccionada})`, value: resumenCurso.malTodas, color: '#b91c1c' },
        ];

  const segmentosEstudiante = useMemo(() => {
    if (!estudianteSeleccionado) return [];
    if (materiaSeleccionada !== 'TODAS') {
      const nota = Number(estudianteSeleccionado.promedioActivo.toFixed(1));
      const restante = Number(Math.max(escalaMax - nota, 0).toFixed(1));
      return [
        {
          label: nota >= notaMinimaAprobacion ? 'Nota obtenida (Aprobado)' : 'Nota obtenida (Reprobado)',
          value: nota,
          color: nota >= notaMinimaAprobacion ? '#15803d' : '#b91c1c',
        },
        {
          label: 'Puntos faltantes',
          value: restante,
          color: '#e9ecef',
        },
      ];
    }
    return [
      {
        label: 'Áreas aprobadas',
        value: estudianteSeleccionado.aprobadas,
        color: '#15803d',
      },
      {
        label: 'Áreas reprobadas',
        value: estudianteSeleccionado.reprobadas,
        color: '#b91c1c',
      },
    ];
  }, [estudianteSeleccionado, materiaSeleccionada, notaMinimaAprobacion, escalaMax]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#ced4da]">
        <div className="w-10 h-10 rounded bg-[#1177d1] flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Progresión y Balance por Hitos</h1>
          <p className="text-xs text-[#6c757d]">Distribución general del curso y estado individual por estudiante y materia</p>
        </div>
      </div>

      {/* Filtros: Año, Hito y Materia */}
      <div className="bg-white border border-[#ced4da] rounded p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-[#6c757d] uppercase block mb-1">Gestión / Año</label>
          <select
            value={anio}
            onChange={(e) => {
              setAnio(e.target.value);
              cargar(e.target.value);
            }}
            className="w-full bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm font-medium"
          >
            <option value="">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={a}>
                Gestión {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#6c757d] uppercase block mb-1">Hito</label>
          <select
            value={hitoSeleccionado}
            onChange={(e) => setHitoSeleccionado(e.target.value)}
            disabled={hitosDisponibles.length === 0}
            className="w-full bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm font-medium"
          >
            {hitosDisponibles.length > 1 && (
              <option value="TODOS">Todos los hitos ({hitosDisponibles.length})</option>
            )}
            {hitosDisponibles.map((h) => (
              <option key={h} value={h}>
                Hito {h}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#6c757d] uppercase block mb-1">Materia / Área</label>
          <select
            value={materiaSeleccionada}
            onChange={(e) => setMateriaSeleccionada(e.target.value)}
            disabled={materias.length === 0}
            className="w-full bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm font-medium"
          >
            <option value="TODAS">Todas las materias ({materias.length})</option>
            {materias.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {estudiantesProcesados.length === 0 && !loading && (
        <div className="bg-white border border-[#ced4da] rounded p-8 text-center">
          <p className="text-[#212529] font-semibold">No hay datos registrados para este filtro.</p>
          <p className="text-sm text-[#6c757d] mt-1">Carga hitos desde la sección Cargar datos.</p>
        </div>
      )}

      {estudiantesProcesados.length > 0 && (
        <div className="space-y-6">
          {/* SECCIÓN 1: PASTELITO DE TODO EL CURSO */}
          <div className="bg-white border border-[#ced4da] rounded p-6 space-y-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e9ecef] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#1177d1] uppercase tracking-wider block">
                  Sección 1 · Panorama General del Curso
                </span>
                <h2 className="text-lg font-bold text-[#212529]">
                  {materiaSeleccionada === 'TODAS' ? 'Todas las materias' : materiaSeleccionada} — {etiquetaHito}
                </h2>
              </div>
              <div className="bg-[#f8f9fa] border border-[#ced4da] rounded px-4 py-2 text-right shrink-0">
                <span className="text-[10px] font-bold text-[#6c757d] uppercase block">
                  Promedio Estándar
                </span>
                <span className="text-xl font-extrabold text-[#1177d1]">
                  {resumenCurso.promedioEstandar.toFixed(1)} pts
                </span>
              </div>
            </div>

            {/* Pastelito con espacio holgado */}
            <div className="overflow-x-auto py-1">
              <DonutChart
                segmentos={segmentosCurso}
                centroValue={`${resumenCurso.total}`}
                centroLabel="Estudiantes"
                size={190}
                thickness={28}
              />
            </div>

            {/* Tarjetas resumen debajo */}
            <div className={`grid grid-cols-1 ${materiaSeleccionada === 'TODAS' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 pt-2 border-t border-[#e9ecef]`}>
              <div className="bg-green-50 border border-green-200 rounded p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-green-800 block">
                    {materiaSeleccionada === 'TODAS' ? 'Bien en todas las áreas' : 'Aprobados'}
                  </span>
                  <span className="text-[11px] text-green-700">
                    {resumenCurso.total > 0
                      ? `${Math.round((resumenCurso.bienTodas / resumenCurso.total) * 100)}% del curso`
                      : '0%'}
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-green-800">
                  {resumenCurso.bienTodas}
                </span>
              </div>

              {materiaSeleccionada === 'TODAS' && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-800 block">
                      Con áreas en riesgo
                    </span>
                    <span className="text-[11px] text-amber-700">
                      {resumenCurso.total > 0
                        ? `${Math.round((resumenCurso.mixto / resumenCurso.total) * 100)}% del curso`
                        : '0%'}
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold text-amber-800">
                    {resumenCurso.mixto}
                  </span>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-800 block">
                    {materiaSeleccionada === 'TODAS' ? 'Mal en todas las áreas' : 'Reprobados'}
                  </span>
                  <span className="text-[11px] text-red-700">
                    {resumenCurso.total > 0
                      ? `${Math.round((resumenCurso.malTodas / resumenCurso.total) * 100)}% del curso`
                      : '0%'}
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-red-800">
                  {resumenCurso.malTodas}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PASTELITO POR ESTUDIANTE */}
          <div className="bg-white border border-[#ced4da] rounded p-6 space-y-4 overflow-hidden">
            <div className="border-b border-[#e9ecef] pb-3">
              <span className="text-[10px] font-bold text-[#1177d1] uppercase tracking-wider block">
                Sección 2 · Detalle Individual
              </span>
              <h2 className="text-lg font-bold text-[#212529]">Pastelito por Estudiante</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Selector de Estudiante */}
              <div className="lg:col-span-4 border border-[#ced4da] rounded overflow-hidden">
                <div className="p-3 bg-[#f8f9fa] border-b border-[#ced4da] space-y-2">
                  <span className="text-xs font-bold text-[#212529] uppercase block">
                    Estudiantes ({filtradosLista.length})
                  </span>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full bg-white border border-[#ced4da] text-[#212529] rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2 space-y-1.5">
                  {filtradosLista.map((est) => {
                    const activo = estudianteSeleccionado?.nombre === est.nombre;
                    return (
                      <button
                        key={est.nombre}
                        onClick={() => setEstudianteActivo(est)}
                        className={`w-full text-left p-2.5 rounded border transition-colors ${
                          activo
                            ? 'bg-[#1177d1] text-white border-[#1177d1]'
                            : 'bg-white border-[#ced4da] hover:bg-[#f8f9fa] text-[#212529]'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 text-xs">
                          <span className="font-semibold truncate">{est.nombre}</span>
                          <span className="font-bold shrink-0">{est.promedioActivo.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-[10px] ${activo ? 'text-white/80' : 'text-[#6c757d]'}`}>
                            {est.aprobadas}/{est.materiasConsolidado.length} áreas aprobadas
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              activo
                                ? 'bg-white/20 text-white'
                                : est.bienEnTodas
                                  ? 'bg-green-50 text-green-700'
                                  : est.malEnTodas
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {est.bienEnTodas ? 'Bien en todo' : est.malEnTodas ? 'Mal en todo' : 'Mixto'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pastelito del Estudiante Seleccionado */}
              {estudianteSeleccionado && (
                <div className="lg:col-span-8 bg-[#f8f9fa] border border-[#ced4da] rounded p-5 space-y-5 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ced4da] pb-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[#212529] truncate">
                        {estudianteSeleccionado.nombre}
                      </h3>
                      <p className="text-xs text-[#6c757d]">{etiquetaHito}</p>
                    </div>
                    <span className="text-sm font-bold text-[#1177d1] shrink-0">
                      Promedio: {estudianteSeleccionado.promedioActivo.toFixed(1)} pts
                    </span>
                  </div>

                  {/* Pastelito con todo el ancho disponible para que su leyenda interna no choque */}
                  <div className="bg-white border border-[#ced4da] rounded p-4 overflow-x-auto">
                    <DonutChart
                      segmentos={segmentosEstudiante}
                      centroValue={
                        materiaSeleccionada === 'TODAS'
                          ? `${estudianteSeleccionado.aprobadas}/${estudianteSeleccionado.materiasConsolidado.length}`
                          : `${estudianteSeleccionado.promedioActivo.toFixed(1)}`
                      }
                      centroLabel={materiaSeleccionada === 'TODAS' ? 'Aprobadas' : 'Promedio'}
                      size={170}
                      thickness={24}
                    />
                  </div>

                  {/* Listado limpio debajo del pastelito */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#212529] uppercase block">
                      Estado por Materia
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {estudianteSeleccionado.materiasConsolidado.map((m) => {
                        const ok = m.promedio >= notaMinimaAprobacion;
                        return (
                          <div
                            key={m.materia}
                            className="bg-white border border-[#ced4da] rounded px-3 py-2 flex justify-between items-center text-xs gap-2"
                          >
                            <span className="font-medium text-[#212529] truncate">
                              {m.materia}
                            </span>
                            <span
                              className={`font-bold shrink-0 px-2 py-0.5 rounded border ${
                                ok
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {m.promedio.toFixed(1)} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}