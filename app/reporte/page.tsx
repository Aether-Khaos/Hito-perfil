'use client';
import { useMemo } from 'react';
import { analizarHito, compararHitos, HITOS, temaDe, TIPOS_ERROR, type AnalisisHito, type HitoId } from '@/lib/analisis-hitos';
import { leerCargas } from '@/lib/almacen-hitos';
import { useMontado } from '@/lib/montado';
import { PerfilDiagnosticoVista, InsigniaNivel, InsigniaRiesgo } from '@/components/PerfilDiagnostico';
import { BarraApilada, Dona, ListaBarras, num } from '@/components/graficos';
import { ERROR_COLOR, NIVEL_COLOR } from '@/lib/paleta';

/** Reporte imprimible (Ctrl+P → Guardar como PDF). Lee los datos del navegador. */
export default function Reporte() {
  const montado = useMontado();
  if (!montado) return null;
  return <ContenidoReporte />;
}

function ContenidoReporte() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const tipo = params.get('tipo') === 'estudiante' ? 'estudiante' : 'global';
  const hito = (params.get('hito') ?? 'Inicial') as HitoId;
  const anonimo = params.get('anonimo') === '1';
  const clave = params.get('clave') ?? '';

  const { analisis, comparacion } = useMemo(() => {
    const cargas = leerCargas();
    const todos = HITOS.filter((h) => cargas[h]).map((h) => analizarHito(cargas[h]!));
    return { analisis: todos.find((a) => a.hito === hito), comparacion: compararHitos(todos) };
  }, [hito]);

  if (!analisis) {
    return <p className="p-10 text-sm">No hay datos del Hito {hito} en este navegador. Vuelve a la página principal y carga el libro.</p>;
  }

  const perfil = analisis.estudiantes.find((e) => e.clave === clave);
  const fecha = new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-[900px] bg-white px-8 py-8 text-tinta print:max-w-none print:px-0 print:py-0">
      <div className="no-imprimir mb-6 flex items-center justify-between rounded-lg border border-borde bg-acento-suave px-4 py-3 text-sm">
        <span>Vista de impresión. Usa «Guardar como PDF» en el diálogo de impresión.</span>
        <button onClick={() => window.print()} className="rounded-lg bg-acento px-4 py-1.5 text-xs font-semibold text-white">
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="mb-6 flex items-end justify-between border-b-2 border-acento pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-tinta-3">Universidad Adventista de Bolivia · Ingeniería de Sistemas · Sociedad de Investigación</p>
          <h1 className="text-xl font-bold">
            {tipo === 'estudiante' ? 'Reporte del estudiante' : 'Reporte del curso'} · Hito {analisis.hito}
          </h1>
        </div>
        <p className="text-xs text-tinta-2">{fecha}</p>
      </div>

      {tipo === 'estudiante' ? (
        perfil ? (
          <PerfilDiagnosticoVista analisis={analisis} perfil={perfil} anonimo={anonimo} comparacion={comparacion} impresion />
        ) : (
          <p className="text-sm">No se encontró al estudiante solicitado.</p>
        )
      ) : (
        <ReporteGlobal analisis={analisis} anonimo={anonimo} />
      )}

      <p className="mt-8 border-t border-borde pt-3 text-[10px] leading-relaxed text-tinta-3">
        Generado por Perfil Hito. Cada nota es el porcentaje de los puntos de la pregunta; una celda vacía no cuenta como cero. Niveles UAB: Inicio 0–30, Proceso 31–50,
        Logrado 51–70, Destacado 71–89, Excepcional 90–100. El tipo de error se estima a partir del puntaje.
        {anonimo ? ' Los estudiantes aparecen con un código.' : ' Contiene datos personales: uso académico interno.'}
      </p>
    </div>
  );
}

function ReporteGlobal({ analisis, anonimo }: { analisis: AnalisisHito; anonimo: boolean }) {
  const g = analisis.global;
  const logrado = g.distribucion.Logrado + g.distribucion.Destacado + g.distribucion.Excepcional;
  return (
    <div className="space-y-6">
      <section className="sin-cortar grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          ['Estudiantes', String(g.n)],
          ['Promedio del curso', `${num(g.estadisticos.media, 0)} %`],
          ['Nivel esperado o más', `${logrado} de ${g.n}`],
          ['Apoyo urgente', String(g.riesgo.alto)],
        ].map(([e, v]) => (
          <div key={e} className="rounded border border-borde px-3 py-2">
            <div className="text-[10px] font-bold uppercase text-tinta-3">{e}</div>
            <div className="text-xl font-bold">{v}</div>
          </div>
        ))}
      </section>

      <section className="sin-cortar">
        <h2 className="mb-3 text-sm font-bold uppercase text-tinta">1. Promedio por asignatura</h2>
        <ListaBarras items={analisis.materias.map((m) => ({ etiqueta: m.materia, valor: m.estadisticos.media, nota: `${num(m.pctLogradoOMas, 0)} % alcanza el nivel esperado` }))} />
      </section>

      <section className="sin-cortar">
        <h2 className="mb-3 text-sm font-bold uppercase text-tinta">2. Nivel por asignatura</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {analisis.materias.map((m) => (
            <div key={m.materia} className="flex flex-col items-center gap-1 rounded border border-borde p-2">
              <p className="text-center text-[11px] font-bold">{m.materia}</p>
              <Dona
                leyenda={false}
                tamano={96}
                grosor={14}
                centroValor={`${num(m.estadisticos.media, 0)}%`}
                segmentos={Object.entries(NIVEL_COLOR).map(([n, c]) => ({ etiqueta: n, valor: m.distribucion[n] ?? 0, color: c }))}
              />
              <p className="text-center text-[10px] text-tinta-2">
                {Object.keys(NIVEL_COLOR)
                  .map((n) => `${n[0]} ${m.distribucion[n] ?? 0}`)
                  .join(' · ')}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-tinta-3">I: Inicio · P: Proceso · L: Logrado · D: Destacado · E: Excepcional.</p>
      </section>

      <section className="salto-pagina">
        <h2 className="mb-3 text-sm font-bold uppercase text-tinta">3. Resultado por pregunta</h2>
        <table className="w-full text-xs">
          <thead className="border-b border-borde text-left text-tinta-3">
            <tr>
              <th className="py-1">Asignatura · pregunta</th>
              <th>Promedio</th>
              <th>No llegó al 51 %</th>
              <th>Concepto / Proced. / Descuido</th>
            </tr>
          </thead>
          <tbody>
            {analisis.materias.flatMap((m) =>
              m.preguntas.map((p) => (
                <tr key={m.materia + p.id} className="border-b border-borde">
                  <td className="py-1">
                    {m.materia} · {p.corta} {temaDe(p.etiqueta)}
                  </td>
                  <td>{num(p.estadisticos.media, 0)} %</td>
                  <td>{num(p.pctNoLogrado, 0)} %</td>
                  <td>
                    {p.errores.conceptual} / {p.errores.procedimental} / {p.errores.descuido}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>

      <section className="sin-cortar">
        <h2 className="mb-3 text-sm font-bold uppercase text-tinta">4. ¿Por qué se equivocan?</h2>
        <BarraApilada
          segmentos={(['conceptual', 'procedimental', 'descuido'] as const).map((t) => ({ etiqueta: TIPOS_ERROR[t].etiqueta, valor: g.errores[t], color: ERROR_COLOR[t] }))}
        />
      </section>

      <section className="salto-pagina">
        <h2 className="mb-3 text-sm font-bold uppercase text-tinta">5. Estudiantes</h2>
        <table className="w-full text-[11px]">
          <thead className="border-b border-borde text-left text-tinta-3">
            <tr>
              <th className="py-1">#</th>
              <th>Estudiante</th>
              {analisis.materias.map((m) => (
                <th key={m.materia}>{m.materia.split(' ').slice(-1)[0]}</th>
              ))}
              <th>General</th>
              <th>Nivel</th>
              <th>Situación</th>
            </tr>
          </thead>
          <tbody>
            {analisis.estudiantes.map((e) => (
              <tr key={e.clave} className="border-b border-borde">
                <td className="py-0.5">{e.posicion}</td>
                <td>{anonimo ? e.codigo : e.nombre}</td>
                {analisis.materias.map((m) => (
                  <td key={m.materia}>{num(e.materias.find((x) => x.materia === m.materia)?.pct, 0)}</td>
                ))}
                <td className="font-semibold">{num(e.pctGlobal, 0)}</td>
                <td>
                  <InsigniaNivel etiqueta={e.nivel.etiqueta} />
                </td>
                <td>
                  <InsigniaRiesgo nivel={e.riesgo.nivel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
