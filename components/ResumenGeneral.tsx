'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PerfilEstudiante, ResultadoAuditoria } from '@/lib/types';
import type { AnalisisHito } from '@/lib/analisis-hitos';
import { fmt } from '@/lib/utils';
import { SearchInput } from '@/components/ui';
import { MiniBar } from '@/components/DonutChart';
import { ResumenGlobal } from '@/components/Vistas';
import { InsigniaNivel, InsigniaRiesgo } from '@/components/PerfilDiagnostico';
import { buscarPerfil } from '@/lib/usar-hitos';

/** Resumen general del curso (tortas) y lista general con «Ver perfil». */
export function ResumenGeneral({
  resultado,
  analisis,
  onVerPerfil,
}: {
  resultado: ResultadoAuditoria;
  analisis: AnalisisHito | null;
  onVerPerfil: (est: PerfilEstudiante) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const materias = Object.keys(resultado.datosMaterias || {});
  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return [...resultado.perfilesEstudiantes]
      .sort((a, b) => b.promedioGeneral - a.promedioGeneral)
      .map((e, i) => ({ e, puesto: i + 1 }))
      .filter(({ e }) => !t || e.nombre.toLowerCase().includes(t) || e.correo.toLowerCase().includes(t));
  }, [resultado.perfilesEstudiantes, busqueda]);

  return (
    <div className="space-y-6">
      {analisis ? (
        <ResumenGlobal analisis={analisis} />
      ) : (
        <div className="rounded border border-blue-200 bg-blue-50 p-5 text-sm text-[#212529]">
          Para ver las tortas del curso, el diagnóstico por pregunta y los reportes en PDF, sube el Excel «Calificaciones por pregunta» en{' '}
          <Link href="/cargar" className="font-semibold text-[#1177d1] underline">
            Cargar datos
          </Link>
          .
        </div>
      )}

      <div className="overflow-hidden rounded border border-[#ced4da] bg-white">
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-[#ced4da] bg-[#f8f9fa] p-4 sm:flex-row sm:items-center">
          <span className="text-sm font-bold text-[#212529]">Listado general · todos los estudiantes</span>
          <div className="w-full sm:w-64">
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar estudiante..." />
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 bg-[#f8f9fa] text-left text-[11px] font-bold uppercase tracking-wide text-[#6c757d]">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Estudiante</th>
                <th className="px-4 py-2">Promedio</th>
                {analisis && <th className="px-4 py-2">Nivel</th>}
                {analisis && <th className="px-4 py-2">Situación</th>}
                {!analisis && <th className="px-4 py-2">Materias</th>}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map(({ e, puesto }) => {
                const d = buscarPerfil(analisis, e.nombre);
                return (
                  <tr key={e.nombre} className="border-t border-[#e9ecef] hover:bg-[#f8f9fa]">
                    <td className="px-4 py-2 text-[#6c757d]">{puesto}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-[#212529]">{e.nombre}</div>
                      <div className="w-40 pt-1">
                        <MiniBar value={e.promedioGeneral} max={100} tone={e.promedioGeneral >= 51 ? 'emerald' : 'rose'} />
                      </div>
                    </td>
                    <td className="px-4 py-2 font-semibold text-[#212529]">{fmt(e.promedioGeneral)}</td>
                    {analisis && <td className="px-4 py-2">{d ? <InsigniaNivel etiqueta={d.nivel.etiqueta} /> : '—'}</td>}
                    {analisis && <td className="px-4 py-2">{d ? <InsigniaRiesgo nivel={d.riesgo.nivel} /> : '—'}</td>}
                    {!analisis && <td className="px-4 py-2 text-xs text-[#6c757d]">{Object.keys(e.materias).length} de {materias.length}</td>}
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onVerPerfil(e)}
                        className="whitespace-nowrap rounded border border-[#1177d1] px-3 py-1 text-xs font-semibold text-[#1177d1] hover:bg-[#1177d1] hover:text-white"
                      >
                        Ver perfil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
