'use client';
import { useMemo, useRef, useState } from 'react';
import { HITOS, analizarHito, compararHitos, type AnalisisHito, type CargaHito, type HitoId } from '@/lib/analisis-hitos';
import { borrarCarga, guardarCarga, hitosCargados, leerCargas } from '@/lib/almacen-hitos';
import { useMontado } from '@/lib/montado';
import { ResumenGlobal, VistaEstudiantes, VistaMaterias, VistaProgresion } from '@/components/Vistas';

type Pestana = 'global' | 'materias' | 'estudiantes' | 'progresion';

const PESTANAS: Array<{ id: Pestana; etiqueta: string }> = [
  { id: 'global', etiqueta: 'Resumen del curso' },
  { id: 'estudiantes', etiqueta: 'Perfil por estudiante' },
  { id: 'materias', etiqueta: 'Por asignatura' },
  { id: 'progresion', etiqueta: 'Avance entre hitos' },
];

export default function Inicio() {
  const montado = useMontado();
  if (!montado) return <Cascaron />;
  return <Aplicacion />;
}

function Cascaron() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-tinta-2">Cargando Hito-Perfil…</div>
  );
}

function Aplicacion() {
  const [cargas, setCargas] = useState<Partial<Record<HitoId, CargaHito>>>(() => leerCargas());
  const [hitoSel, setHitoSel] = useState<HitoId>('Inicial');
  const [vista, setVista] = useState<HitoId | null>(() => hitosCargados(leerCargas())[0] ?? null);
  const [pestana, setPestana] = useState<Pestana>('global');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'aviso'; texto: string } | null>(null);
  const [url, setUrl] = useState('');
  const entrada = useRef<HTMLInputElement>(null);

  const analisisPorHito = useMemo(() => {
    const salida: Partial<Record<HitoId, AnalisisHito>> = {};
    for (const h of HITOS) if (cargas[h]) salida[h] = analizarHito(cargas[h]!);
    return salida;
  }, [cargas]);
  const comparacion = useMemo(() => compararHitos(Object.values(analisisPorHito) as AnalisisHito[]), [analisisPorHito]);
  const disponibles = hitosCargados(cargas);
  const hitoVista = vista && cargas[vista] ? vista : disponibles[0] ?? null;
  const analisis = hitoVista ? analisisPorHito[hitoVista] : undefined;

  const procesar = async (cuerpo: FormData | string, archivos: string[]) => {
    setCargando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/perfiles', {
        method: 'POST',
        ...(typeof cuerpo === 'string' ? { headers: { 'Content-Type': 'application/json' }, body: cuerpo } : { body: cuerpo }),
      });
      const data = await res.json();
      if (!data.success) {
        setMensaje({ tipo: 'error', texto: data.error ?? 'No se pudo procesar el libro.' });
        return;
      }
      if (!data.registros?.length) {
        setMensaje({
          tipo: 'error',
          texto:
            'El libro no tiene calificaciones por pregunta. Sube «Calificaciones por pregunta» (puede ir junto con «Calificaciones por materia», que se usa para la validación cruzada).',
        });
        return;
      }
      const carga: CargaHito = {
        hito: hitoSel,
        archivos,
        cargadoEn: new Date().toISOString(),
        registros: data.registros,
        consolidado: data.consolidado ?? [],
        advertencias: data.advertencias ?? [],
      };
      const aviso = guardarCarga(carga);
      setCargas((c) => ({ ...c, [hitoSel]: carga }));
      setVista(hitoSel);
      const estudiantes = new Set(carga.registros.map((r) => r.nombre)).size;
      setMensaje({
        tipo: aviso ? 'aviso' : 'ok',
        texto: `Hito ${hitoSel}: ${estudiantes} estudiantes y ${data.hojasProcesadas.length} asignaturas analizadas${carga.consolidado.length ? ', con consolidado por materia' : ''}.${aviso ? ` ${aviso}` : ''}`,
      });
      if (entrada.current) entrada.current.value = '';
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de red al procesar el libro. ¿Está corriendo el servidor (npm run dev)?' });
    } finally {
      setCargando(false);
    }
  };

  const subirArchivos = () => {
    const lista = Array.from(entrada.current?.files ?? []);
    if (!lista.length) return;
    const f = new FormData();
    for (const a of lista) f.append('archivo', a);
    f.append('compacto', '1');
    procesar(f, lista.map((a) => a.name));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 w-full border-b border-[#ced4da] bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-acento text-sm font-bold text-white">PH</div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight text-tinta">Perfil Hito</h1>
              <p className="truncate text-[11px] text-tinta-3">Diagnóstico por hitos · Sociedad de Investigación · UAB</p>
            </div>
          </div>
          <div className="hidden text-xs text-tinta-3 md:block">Ingeniería de Sistemas</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-8">
        <section className="rounded border border-borde bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="lg:w-48">
              <label className="text-xs font-semibold uppercase text-tinta-2">Hito</label>
              <select
                value={hitoSel}
                onChange={(e) => setHitoSel(e.target.value as HitoId)}
                className="mt-1 w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm"
              >
                {HITOS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                    {cargas[h] ? ' (cargado)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-tinta-2">Archivos de Excel (.xlsx)</label>
              <input
                ref={entrada}
                type="file"
                multiple
                accept=".xlsx,.xlsm"
                className="mt-1 block w-full text-sm text-tinta-2 file:mr-3 file:rounded-lg file:border-0 file:bg-acento-suave file:px-4 file:py-2 file:text-sm file:font-semibold file:text-acento hover:file:bg-[#d6e5f8]"
              />
              <p className="mt-1 text-[11px] text-tinta-3">
                Sube «Calificaciones por pregunta» y, si lo tienes, «Calificaciones por materia». Puedes elegir los dos a la vez.
              </p>
            </div>
            <button
              onClick={subirArchivos}
              disabled={cargando}
              className="rounded bg-acento px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#184f95] disabled:opacity-50"
            >
              {cargando ? 'Analizando…' : `Analizar como Hito ${hitoSel}`}
            </button>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-acento">O cargar desde un enlace de Google Sheets</summary>
            <form
              className="mt-2 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) procesar(JSON.stringify({ url: url.trim(), compacto: true }), ['Google Sheets']);
              }}
            >
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="flex-1 rounded-lg border border-borde px-3 py-2 font-mono text-xs"
              />
              <button disabled={cargando} className="rounded-lg border border-acento px-4 py-2 text-xs font-semibold text-acento disabled:opacity-50">
                Cargar enlace
              </button>
            </form>
          </details>
          {mensaje && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                mensaje.tipo === 'ok'
                  ? 'border-[#b7e4c7] bg-[#effaf2] text-[#14532d]'
                  : mensaje.tipo === 'aviso'
                    ? 'border-[#f5d88c] bg-[#fff8e6] text-[#7a5300]'
                    : 'border-[#f4c7c3] bg-[#fdf0ef] text-[#912018]'
              }`}
            >
              {mensaje.texto}
            </div>
          )}
          {disponibles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-tinta-2">Hitos cargados:</span>
              {disponibles.map((h) => (
                <span key={h} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${hitoVista === h ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
                  <button onClick={() => setVista(h)} className="font-medium text-tinta">
                    {h} · {new Set(cargas[h]!.registros.map((r) => r.nombre)).size} est.
                  </button>
                  <button
                    title={`Quitar Hito ${h}`}
                    onClick={() => {
                      borrarCarga(h);
                      setCargas((c) => {
                        const copia = { ...c };
                        delete copia[h];
                        return copia;
                      });
                    }}
                    className="text-tinta-3 hover:text-[#b42318]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {analisis ? (
          <>
            <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-borde px-4 sm:mx-0 sm:px-0">
              {PESTANAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPestana(p.id)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${
                    pestana === p.id ? 'border-acento text-acento' : 'border-transparent text-tinta-2 hover:text-tinta'
                  }`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </nav>
            {pestana === 'global' && <ResumenGlobal analisis={analisis} />}
            {pestana === 'materias' && <VistaMaterias key={analisis.hito} analisis={analisis} />}
            {pestana === 'estudiantes' && <VistaEstudiantes key={analisis.hito} analisis={analisis} comparacion={comparacion} />}
            {pestana === 'progresion' && <VistaProgresion analisisPorHito={analisisPorHito} comparacion={comparacion} />}
          </>
        ) : (
          <section className="rounded border border-dashed border-borde bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-tinta">Carga el libro del Hito Inicial para empezar</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-tinta-2">
              Verás cómo le fue a cada estudiante en cada pregunta, qué domina, qué le cuesta y qué debe estudiar. Cuando cargues el Intermedio y el Final, también verás su avance.
            </p>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-[1500px] px-4 pb-8 pt-2 text-[11px] text-tinta-3 sm:px-8">
        Los datos se guardan solo en este navegador. El perfil es una guía para estudiantes y docentes: no reemplaza la calificación.
      </footer>
    </div>
  );
}
