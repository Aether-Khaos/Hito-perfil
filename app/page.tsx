'use client';
import { useState } from 'react';
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
