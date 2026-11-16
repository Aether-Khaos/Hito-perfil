'use client';

import { useState, useEffect } from 'react';
import { ResultadoAuditoria, SeccionActiva, PerfilEstudiante } from '@/lib/types';
import { MatterTabs } from '@/components/MatterTabs';
import { MatterDashboard } from '@/components/dashboard/MatterDashboard';
import { MatterProfile } from '@/components/profile/MatterProfile';
import { StudentProfile } from '@/components/profile/StudentProfile';

const SECCIONES: Array<{ id: SeccionActiva; label: string }> = [
  { id: 'materia-dashboard', label: 'Dashboard' },
  { id: 'perfil-materia', label: 'Materia' },
  { id: 'estudiante', label: 'Estudiante' },
];

// Type guard: valida que un objeto desconocido sea ResultadoAuditoria
function esResultadoAuditoria(x: unknown): x is ResultadoAuditoria {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.success === 'boolean' &&
    Array.isArray(obj.perfilesEstudiantes) &&
    typeof obj.datosMaterias === 'object' &&
    typeof obj.estadisticasMaterias === 'object'
  );
}

export default function Analisis() {
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null);
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('materia-dashboard');
  const [materiaActiva, setMateriaActiva] = useState('');
  const [estudianteActivo, setEstudianteActivo] = useState<PerfilEstudiante | null>(null);
  const [buscoMateria, setBuscoMateria] = useState('');
  const [buscoEstudiante, setBuscoEstudiante] = useState('');
  const [buscoPerfilMateria, setBuscoPerfilMateria] = useState('');
  const [filtro, setFiltro] = useState<{ anio: string; nivel: string } | null>(null);

  const aplicarResultado = (data: ResultadoAuditoria) => {
    setResultado(data);
    const materias = Object.keys(data.datosMaterias || {});
    if (materias.length > 0) setMateriaActiva(materias[0]);
    if (data.perfilesEstudiantes.length > 0) setEstudianteActivo(data.perfilesEstudiantes[0]);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('historial_data');
    const filtroStr = sessionStorage.getItem('historial_filtro');

    if (cached) {
      try {
        const parsed: unknown = JSON.parse(cached);
        if (esResultadoAuditoria(parsed)) {
          aplicarResultado(parsed);
        }
        if (filtroStr) {
          const f: unknown = JSON.parse(filtroStr);
          if (f && typeof f === 'object' && 'anio' in f && 'nivel' in f) {
            setFiltro(f as { anio: string; nivel: string });
          }
        }
      } catch (e) {
        console.error('Error parseando caché:', e);
      }
    } else {
      fetch('/api/historial')
        .then((r) => r.json())
        .then((d: unknown) => {
          if (esResultadoAuditoria(d) && d.success) {
            aplicarResultado(d);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!resultado || resultado.perfilesEstudiantes.length === 0) {
    return (
      <div className="bg-white border border-[#ced4da] rounded p-8 text-center space-y-3 max-w-2xl">
        <p className="text-[#212529] font-semibold">No hay datos para mostrar.</p>
        <p className="text-sm text-[#6c757d]">
          Carga un Google Sheet en <strong>Cargar datos</strong> o selecciona un filtro en <strong>Historial</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#ced4da]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#1177d1] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#212529]">Análisis</h1>
            <p className="text-xs text-[#6c757d]">
              {filtro ? `Filtro: ${filtro.anio || 'todos'} / ${filtro.nivel || 'todos'}` : 'Todos los datos guardados'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-[#f8f9fa] border border-[#ced4da] rounded p-1">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccionActiva(s.id)}
              className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                seccionActiva === s.id
                  ? 'bg-[#1177d1] text-white shadow-sm'
                  : 'text-[#6c757d] hover:text-[#212529]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {(seccionActiva === 'materia-dashboard' || seccionActiva === 'perfil-materia') && (
        <MatterTabs
          materias={Object.keys(resultado.estadisticasMaterias || {})}
          activa={materiaActiva}
          onChange={setMateriaActiva}
        />
      )}

      {seccionActiva === 'materia-dashboard' && materiaActiva && (
        <MatterDashboard resultado={resultado} materiaActiva={materiaActiva} busqueda={buscoMateria} onBusquedaChange={setBuscoMateria} />
      )}
      {seccionActiva === 'perfil-materia' && materiaActiva && (
        <MatterProfile resultado={resultado} materiaActiva={materiaActiva} busqueda={buscoPerfilMateria} onBusquedaChange={setBuscoPerfilMateria} />
      )}
      {seccionActiva === 'estudiante' && estudianteActivo && (
        <StudentProfile resultado={resultado} estudianteActivo={estudianteActivo} busqueda={buscoEstudiante} onBusquedaChange={setBuscoEstudiante} onSelect={setEstudianteActivo} />
      )}
    </div>
  );
}