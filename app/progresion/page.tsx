'use client';

import { useState, useEffect } from 'react';
import { WaveChart, type PuntoOnda } from '@/components/WaveChart';

interface PorMateria { promedio: number; p1: number; p2: number; p3: number; }
interface PuntoHito {
  nivel: string;
  p1: number; p2: number; p3: number; promedio: number;
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

const COLORES_MATERIA = [
  '#1177d1', '#15803d', '#b45309', '#7c3aed', '#b91c1c',
  '#0e7490', '#a16207', '#be185d', '#4d7c0f', '#4338ca',
];

type Vista = 'estudiante' | 'curso' | 'comparativa';

export default function Progresion() {
  const [anios, setAnios] = useState<string[]>([]);
  const [anio, setAnio] = useState('');
  const [estudiantes, setEstudiantes] = useState<EstudianteProgresion[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [promediosCurso, setPromediosCurso] = useState<Record<string, Record<string, number>>>({});
  const [estudianteActivo, setEstudianteActivo] = useState<EstudianteProgresion | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>('estudiante');
  const [materiaComparativa, setMateriaComparativa] = useState('');

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
        setAnios(data.anios || []);
        setEstudiantes(data.estudiantes || []);
        setMaterias(data.materias || []);
        setPromediosCurso(data.promediosCurso || {});
        setEstudianteActivo(data.estudiantes?.[0] ?? null);
        setMateriaComparativa(data.materias?.[0] ?? '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(''); }, []);

  const filtrados = estudiantes.filter((e) => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return true;
    return e.nombre.toLowerCase().includes(t) || e.correo.toLowerCase().includes(t);
  });

  const escalaMax = materias.length > 0
    ? Math.max(
        20,
        ...estudiantes.flatMap((e) => e.progresion.flatMap((p) => [p.promedio, ...Object.values(p.porMateria).map((m) => m.promedio)]))
      )
    : 20;

  const categorias = estudianteActivo?.progresion.map((p) => p.nivel) ?? [];

  // Puntos para vista "estudiante"
  const puntosEstudiante: PuntoOnda[] = (() => {
    if (!estudianteActivo) return [];
    return estudianteActivo.progresion.map((p, i) => ({
      label: p.nivel,
      valor: p.promedio,
      color: COLORES_MATERIA[i % COLORES_MATERIA.length],
    }));
  })();

  // Puntos para vista "curso"
  const puntosCurso: PuntoOnda[] = (() => {
    if (categorias.length === 0) return [];
    return categorias.map((nivel, i) => {
      const vals = materias
        .map((m) => promediosCurso[nivel]?.[m] ?? 0)
        .filter((v) => v > 0);
      const promedio = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return {
        label: nivel,
        valor: promedio,
        color: COLORES_MATERIA[i % COLORES_MATERIA.length],
      };
    });
  })();

  // Puntos para vista "comparativa"
  const puntosComparativaEst: PuntoOnda[] = (() => {
    if (!estudianteActivo || !materiaComparativa) return [];
    return estudianteActivo.progresion.map((p) => ({
      label: p.nivel,
      valor: p.porMateria[materiaComparativa]?.promedio ?? 0,
      color: '#1177d1',
    }));
  })();

  const puntosComparativaCurso: PuntoOnda[] = (() => {
    if (!estudianteActivo || !materiaComparativa) return [];
    return estudianteActivo.progresion.map((p) => ({
      label: p.nivel,
      valor: promediosCurso[p.nivel]?.[materiaComparativa] ?? 0,
      color: '#b91c1c',
    }));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#ced4da]">
        <div className="w-10 h-10 rounded bg-[#1177d1] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Progresión de Hitos</h1>
          <p className="text-xs text-[#6c757d]">Evolución secuencial Inicial → Intermedio → Avanzado</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#ced4da] rounded p-4 flex flex-col sm:flex-row gap-3">
        <select
          value={anio}
          onChange={(e) => { setAnio(e.target.value); cargar(e.target.value); }}
          className="bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex-1 flex items-center gap-2 bg-[#f8f9fa] border border-[#ced4da] rounded p-1">
          {(['estudiante', 'curso', 'comparativa'] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                vista === v ? 'bg-[#1177d1] text-white' : 'text-[#6c757d] hover:text-[#212529]'
              }`}
            >
              {v === 'estudiante' ? 'Por estudiante' : v === 'curso' ? 'Por curso' : 'Comparativa'}
            </button>
          ))}
        </div>
      </div>

      {estudiantes.length === 0 && !loading && (
        <div className="bg-white border border-[#ced4da] rounded p-8 text-center">
          <p className="text-[#212529] font-semibold">No hay datos de progresión.</p>
          <p className="text-sm text-[#6c757d] mt-1">Carga hitos en Cargar datos.</p>
        </div>
      )}

      {estudiantes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista */}
          <div className="lg:col-span-3 bg-white border border-[#ced4da] rounded">
            <div className="p-4 border-b border-[#ced4da] bg-[#f8f9fa] space-y-2">
              <h3 className="text-xs font-bold text-[#212529] uppercase">Promoción ({filtrados.length})</h3>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-white border border-[#ced4da] text-[#212529] rounded px-2 py-1.5 text-xs"
              />
            </div>
            <div className="max-h-[620px] overflow-y-auto p-2 space-y-1.5">
              {filtrados.map((est) => {
                const activo = estudianteActivo?.nombre === est.nombre;
                return (
                  <button
                    key={est.nombre}
                    onClick={() => setEstudianteActivo(est)}
                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                      activo ? 'bg-[#1177d1] text-white border-[#1177d1]' : 'bg-white border-[#ced4da] hover:bg-[#f8f9fa] text-[#212529]'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 text-[11px]">
                      <span className="font-semibold truncate">{est.nombre}</span>
                      <span className="font-bold shrink-0">{est.promedioConsolidado.toFixed(1)}</span>
                    </div>
                    <div className={`text-[10px] ${activo ? 'text-white/80' : 'text-[#6c757d]'}`}>
                      {est.tendenciaLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido */}
          <div className="lg:col-span-9 space-y-4">
            {vista === 'estudiante' && estudianteActivo && (
              <div className="bg-white border border-[#ced4da] rounded p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#212529] uppercase">{estudianteActivo.nombre}</h3>
                  <span className="text-xs text-[#6c757d]">
                    Promedio: <strong className="text-[#1177d1]">{estudianteActivo.promedioConsolidado.toFixed(1)}</strong>
                  </span>
                </div>
                <WaveChart puntos={puntosEstudiante} escalaMax={escalaMax} />
              </div>
            )}

            {vista === 'curso' && (
              <div className="bg-white border border-[#ced4da] rounded p-5">
                <h3 className="text-sm font-bold text-[#212529] uppercase mb-4">Promedio del Curso por Hito</h3>
                <WaveChart puntos={puntosCurso} escalaMax={escalaMax} />
              </div>
            )}

            {vista === 'comparativa' && estudianteActivo && (
              <div className="bg-white border border-[#ced4da] rounded p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-sm font-bold text-[#212529] uppercase">Estudiante vs Curso</h3>
                  <select
                    value={materiaComparativa}
                    onChange={(e) => setMateriaComparativa(e.target.value)}
                    className="bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-1.5 text-xs"
                  >
                    {materias.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1177d1] uppercase mb-2">Estudiante</p>
                  <WaveChart puntos={puntosComparativaEst} escalaMax={escalaMax} altura={180} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#b91c1c] uppercase mb-2">Curso</p>
                  <WaveChart puntos={puntosComparativaCurso} escalaMax={escalaMax} altura={180} />
                </div>
              </div>
            )}

            {/* Tabla detalle */}
            {estudianteActivo && (
              <div className="bg-white border border-[#ced4da] rounded overflow-hidden">
                <div className="px-5 py-4 border-b border-[#ced4da] bg-[#f8f9fa]">
                  <h3 className="text-sm font-bold text-[#212529] uppercase">Detalle por Hito</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-[#f8f9fa] border-b border-[#ced4da]">
                        <th className="text-left px-4 py-2 font-bold text-[#212529] text-xs uppercase">Hito</th>
                        <th className="text-right px-4 py-2 font-bold text-[#212529] text-xs uppercase">P1</th>
                        <th className="text-right px-4 py-2 font-bold text-[#212529] text-xs uppercase">P2</th>
                        <th className="text-right px-4 py-2 font-bold text-[#212529] text-xs uppercase">P3</th>
                        <th className="text-right px-4 py-2 font-bold text-[#212529] text-xs uppercase">Promedio</th>
                        <th className="text-right px-4 py-2 font-bold text-[#212529] text-xs uppercase">Δ P1→P3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudianteActivo.progresion.map((p) => {
                        const delta = p.p3 - p.p1;
                        return (
                          <tr key={p.nivel} className="border-b border-[#e9ecef] last:border-0 hover:bg-[#f8f9fa]">
                            <td className="px-4 py-2 font-bold text-[#1177d1]">{p.nivel}</td>
                            <td className="px-4 py-2 text-right text-[#212529]">{p.p1.toFixed(1)}</td>
                            <td className="px-4 py-2 text-right text-[#212529]">{p.p2.toFixed(1)}</td>
                            <td className="px-4 py-2 text-right text-[#212529]">{p.p3.toFixed(1)}</td>
                            <td className="px-4 py-2 text-right font-bold text-[#212529]">{p.promedio.toFixed(1)}</td>
                            <td className={`px-4 py-2 text-right font-bold ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}