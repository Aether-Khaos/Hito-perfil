'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Panel,
  PerfilCompetencias,
  EtiquetaNivel,
  type EstudianteDiagnosticado,
} from '@/components/diagnostico/PerfilCompetencias';

interface ResumenMateria {
  materia: string;
  estudiantes: number;
  pctPromedio: number;
  nivelPromedio: { id: string; etiqueta: string; min: number; max: number };
  pctLogradoOMas: number;
  distribucion: Record<string, number>;
  carenciasFrecuentes: Array<{
    id: string;
    nombre: string;
    materia: string;
    estudiantes: number;
    pctEstudiantes: number;
    puntosEnRiesgo: number;
  }>;
}

interface Almacenado {
  diagnosticos: EstudianteDiagnosticado[];
  resumenCurso: ResumenMateria[];
  advertencias?: string[];
  hojas?: Array<{ materia: string; registros: number; catalogada: boolean }>;
}

const CLAVE = 'perfil_hito_diagnostico';

export default function Diagnostico() {
  const [datos, setDatos] = useState<Almacenado | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    // La lectura se difiere al siguiente turno para no bloquear el primer render
    // y para que el HTML estático no dependa de sessionStorage.
    let cancelado = false;
    const cargar = () => {
      if (cancelado) return;
      try {
        const crudo = sessionStorage.getItem(CLAVE);
        if (!crudo) return;
        const json = JSON.parse(crudo) as Almacenado;
        setDatos(json);
        setSeleccionado(json.diagnosticos?.[0]?.nombre ?? null);
      } catch {
        setDatos(null);
      }
    };
    const temporizador = setTimeout(cargar, 0);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, []);

  const estudiantes = useMemo(() => {
    const lista = datos?.diagnosticos ?? [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return lista;
    return lista.filter((estudiante) => estudiante.nombre.toLowerCase().includes(texto));
  }, [datos, busqueda]);

  const activo = useMemo(
    () => estudiantes.find((estudiante) => estudiante.nombre === seleccionado) ?? estudiantes[0] ?? null,
    [estudiantes, seleccionado],
  );

  const carenciasCurso = useMemo(() => {
    const lista = datos?.resumenCurso ?? [];
    return lista
      .flatMap((materia) => materia.carenciasFrecuentes.slice(0, 3).map((carencia) => ({ ...carencia, materia })))
      .sort((a, b) => b.pctEstudiantes - a.pctEstudiantes)
      .slice(0, 6);
  }, [datos]);

  return (
    <div className="relative min-h-screen w-full bg-[#0b131e] text-slate-200">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">Perfil Hito</p>
            <h1 className="text-2xl font-bold text-slate-100">Diagnóstico por competencias</h1>
            <p className="mt-1 text-sm text-slate-400">
              Qué evalúa cada hito, qué competencias se evidenciaron y qué falta consolidar en cada estudiante.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-500 hover:text-sky-300"
          >
            ← Volver al panel
          </Link>
        </div>

        {!datos && (
          <Panel className="text-center">
            <p className="text-sm font-semibold text-slate-200">Todavía no hay un diagnóstico calculado.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
              Ve al panel principal, pega el enlace del libro de Google Sheets y ejecuta el análisis. El perfil de
              competencias se calcula con esas mismas calificaciones y aparece aquí.
            </p>
          </Panel>
        )}

        {datos && datos.diagnosticos.length === 0 && (
          <Panel className="text-center">
            <p className="text-sm text-slate-300">
              El libro no produjo calificaciones interpretables. Revisa las advertencias del panel principal.
            </p>
          </Panel>
        )}

        {datos && datos.diagnosticos.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {datos.resumenCurso.map((materia) => (
                <Panel key={materia.materia} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100">{materia.materia}</h3>
                    <EtiquetaNivel nivel={materia.nivelPromedio} />
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-2xl font-bold text-sky-400">
                      {materia.pctPromedio.toFixed(1).replace('.', ',')} %
                    </span>
                    <span className="pb-1 text-[11px] text-slate-500">dominio promedio</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {materia.estudiantes} estudiantes ·{' '}
                    {materia.pctLogradoOMas.toFixed(1).replace('.', ',')} % en nivel Logrado o superior
                  </p>
                  <div className="mt-3 space-y-1">
                    {materia.carenciasFrecuentes.slice(0, 2).map((carencia) => (
                      <div key={carencia.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-slate-400" title={carencia.nombre}>
                          {carencia.nombre}
                        </span>
                        <span className="shrink-0 font-semibold text-rose-300">
                          {carencia.pctEstudiantes.toFixed(0)} %
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>

            {carenciasCurso.length > 0 && (
              <Panel>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-200">
                  <span className="h-4 w-1 rounded bg-sky-500" />
                  Competencias con menor evidencia en la cohorte
                </h3>
                <ul className="mt-3 space-y-2">
                  {carenciasCurso.map((carencia) => (
                    <li
                      key={`${carencia.materia.materia}-${carencia.id}`}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{carencia.nombre}</p>
                        <p className="text-[10px] text-slate-500">{carencia.materia.materia}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${Math.min(carencia.pctEstudiantes, 100)}%` }}
                          />
                        </div>
                        <span className="w-32 text-right text-[10px] font-semibold text-slate-400">
                          {carencia.estudiantes} est. · {carencia.puntosEnRiesgo.toFixed(1).replace('.', ',')} pts
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/55 lg:col-span-4">
                <div className="space-y-2 border-b border-slate-800 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                    Estudiantes ({estudiantes.length})
                  </h3>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    placeholder="Nombre…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div className="max-h-[640px] space-y-1.5 overflow-y-auto p-2">
                  {estudiantes.map((estudiante) => {
                    const activoEste = activo?.nombre === estudiante.nombre;
                    return (
                      <button
                        key={estudiante.nombre}
                        onClick={() => setSeleccionado(estudiante.nombre)}
                        className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                          activoEste
                            ? 'border-sky-500/60 bg-sky-500/15 text-slate-100'
                            : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate font-semibold">{estudiante.nombre}</span>
                          <span className="shrink-0 font-bold text-sky-300">
                            {estudiante.pctGlobal.toFixed(1).replace('.', ',')} %
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {estudiante.nivelGlobal.etiqueta} · {estudiante.brechas.length} carencia(s)
                        </div>
                      </button>
                    );
                  })}
                  {estudiantes.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-500">Sin coincidencias.</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8">
                {activo ? (
                  <PerfilCompetencias estudiante={activo} />
                ) : (
                  <Panel className="text-center text-sm text-slate-400">
                    Selecciona un estudiante para ver su perfil de competencias.
                  </Panel>
                )}
              </div>
            </div>

            {datos.advertencias && datos.advertencias.length > 0 && (
              <Panel>
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-300">
                  Advertencias de calidad de datos
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-400">
                  {datos.advertencias.map((aviso, indice) => (
                    <li key={indice}>{aviso}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
