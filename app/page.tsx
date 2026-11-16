'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ResultadoAuditoria, SeccionActiva, PerfilEstudiante } from '@/lib/types';
import { Background } from '@/components/Background';
import { Header } from '@/components/Header';
import { SheetForm } from '@/components/SheetForm';
import { SectionNav } from '@/components/SectionNav';
import { MatterTabs } from '@/components/MatterTabs';
import { MatterDashboard } from '@/components/dashboard/MatterDashboard';
import { MatterProfile } from '@/components/profile/MatterProfile';
import { StudentProfile } from '@/components/profile/StudentProfile';

export default function Home() {
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('materia-dashboard');
  const [materiaActiva, setMateriaActiva] = useState('');
  const [estudianteActivo, setEstudianteActivo] = useState<PerfilEstudiante | null>(null);

  const [buscoMateria, setBuscoMateria] = useState('');
  const [buscoEstudiante, setBuscoEstudiante] = useState('');
  const [buscoPerfilMateria, setBuscoPerfilMateria] = useState('');

  const analizarSheet = async (url: string) => {
    setLoading(true);
    setResultado(null);
    // Reset de buscadores al cargar un nuevo Sheet
    setBuscoMateria('');
    setBuscoEstudiante('');
    setBuscoPerfilMateria('');

    try {
      const res = await fetch('/api/perfiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ResultadoAuditoria & { error?: string } = await res.json();
      if (data.success) {
        setResultado(data);
        const materias = Object.keys(data.datosMaterias || {});
        if (materias.length > 0) setMateriaActiva(materias[0]);
        if (data.perfilesEstudiantes.length > 0) setEstudianteActivo(data.perfilesEstudiantes[0]);

        // El perfil de competencias se calcula en el servidor y se conserva para la
        // vista /diagnostico sin volver a consultar el libro.
        try {
          sessionStorage.setItem(
            'perfil_hito_diagnostico',
            JSON.stringify({
              diagnosticos: data.diagnosticos ?? [],
              resumenCurso: data.resumenCurso ?? [],
              advertencias: data.advertencias ?? [],
              hojas: data.hojasProcesadas ?? [],
            }),
          );
        } catch {
          /* sessionStorage puede estar deshabilitado: la vista de diagnóstico mostrará un aviso. */
        }
      } else {
        alert('Error: ' + (data.error ?? 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al consultar el endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0b131e] text-slate-200 flex flex-col overflow-x-hidden select-none">
      <Background />
      <Header />

      <main className="relative z-10 w-full flex-1 px-4 sm:px-8 lg:px-16 py-10 max-w-[1700px] mx-auto space-y-8">
        <SheetForm loading={loading} onSubmit={analizarSheet} />

        {resultado && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-400">
                {resultado.advertencias && resultado.advertencias.length > 0
                  ? `${resultado.advertencias.length} advertencia(s) de calidad de datos: revisa el diagnóstico.`
                  : 'Calificaciones normalizadas por los máximos de cada evaluación.'}
              </div>
              <Link
                href="/diagnostico"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400 hover:text-sky-200"
              >
                Ver diagnóstico por competencias →
              </Link>
            </div>
            <SectionNav activa={seccionActiva} onChange={setSeccionActiva} />

            {(seccionActiva === 'materia-dashboard' || seccionActiva === 'perfil-materia') && (
              <MatterTabs
                materias={Object.keys(resultado.estadisticasMaterias || {})}
                activa={materiaActiva}
                onChange={setMateriaActiva}
              />
            )}

            {seccionActiva === 'materia-dashboard' && materiaActiva && (
              <MatterDashboard
                resultado={resultado}
                materiaActiva={materiaActiva}
                busqueda={buscoMateria}
                onBusquedaChange={setBuscoMateria}
              />
            )}

            {seccionActiva === 'perfil-materia' && materiaActiva && (
              <MatterProfile
                resultado={resultado}
                materiaActiva={materiaActiva}
                busqueda={buscoPerfilMateria}
                onBusquedaChange={setBuscoPerfilMateria}
              />
            )}

            {seccionActiva === 'estudiante' && estudianteActivo && (
              <StudentProfile
                resultado={resultado}
                estudianteActivo={estudianteActivo}
                busqueda={buscoEstudiante}
                onBusquedaChange={setBuscoEstudiante}
                onSelect={setEstudianteActivo}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
