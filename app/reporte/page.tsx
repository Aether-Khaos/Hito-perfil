'use client';
import { useMemo } from 'react';
import { analizarHito, compararHitos, HITOS, temaDe, TIPOS_ERROR, type AnalisisHito, type HitoId } from '@/lib/analisis-hitos';
import { leerCargas } from '@/lib/almacen-hitos';
import { useMontado } from '@/lib/montado';
import { PerfilDiagnosticoVista, InsigniaNivel, nombreVisible } from '@/components/PerfilDiagnostico';
import { BarraErrores, BarrasDominio, CajasBigotes, DistribucionNiveles, num } from '@/components/graficos';

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
  const anonimo = params.get('anonimo') !== '0';
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
            {tipo === 'estudiante' ? 'Reporte diagnóstico individual' : 'Reporte global de la cohorte'} · Hito {analisis.hito}
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
        Generado por Hito-Perfil. Dominio = puntos obtenidos / máximo de cada pregunta × 100; celdas vacías se excluyen y los ceros cuentan. Niveles UAB: Inicio 0–30,
        Proceso 31–50, Logrado 51–70, Destacado 71–89, Excepcional 90–100. El tipo de error se infiere por banda de puntaje. Documento de uso académico interno
        {anonimo ? '; los estudiantes se identifican con códigos anónimos' : '; contiene datos personales'}.
      </p>
    </div>
  );
}

function ReporteGlobal({ analisis, anonimo }: { analisis: AnalisisHito; anonimo: boolean }) {
  const g = analisis.global;
  return (
    <div className="space-y-6">
      <section className="sin-cortar grid grid-cols-4 gap-3 text-center">
        {[
          ['Estudiantes', String(g.n)],
          ['Dominio medio', `${num(g.estadisticos.media)} %`],
          ['Mediana', `${num(g.estadisticos.mediana)} %`],
          ['Riesgo alto', String(g.riesgo.alto)],
        ].map(([e, v]) => (
          <div key={e} className="rounded-lg border border-borde px-3 py-2">
            <div className="text-[10px] uppercase text-tinta-3">{e}</div>
            <div className="text-xl font-semibold">{v}</div>
          </div>
        ))}
      </section>

      <section className="sin-cortar">
        <h2 className="mb-2 text-sm font-semibold">1. Dominio medio por asignatura</h2>
        <BarrasDominio items={analisis.materias.map((m) => ({ etiqueta: m.materia, valor: m.estadisticos.media }))} />
      </section>
      <section className="sin-cortar">
        <h2 className="mb-2 text-sm font-semibold">2. Distribución por nivel de logro</h2>
        <DistribucionNiveles filas={analisis.materias.map((m) => ({ etiqueta: m.materia, conteos: m.distribucion }))} />
      </section>
      <section className="sin-cortar">
        <h2 className="mb-2 text-sm font-semibold">3. Dispersión (diagramas de caja)</h2>
        <CajasBigotes filas={analisis.materias.map((m) => ({ etiqueta: m.materia, est: m.estadisticos }))} />
      </section>

      <section className="salto-pagina">
        <h2 className="mb-2 text-sm font-semibold">4. Análisis por pregunta</h2>
        <table className="w-full text-xs">
          <thead className="border-b border-borde text-left text-tinta-3">
            <tr>
              <th className="py-1">Asignatura · pregunta</th>
              <th>Media</th>
              <th>p</th>
              <th>D</th>
              <th>No logrado</th>
              <th>C / P / D</th>
            </tr>
          </thead>
          <tbody>
            {analisis.materias.flatMap((m) =>
              m.preguntas.map((p) => (
                <tr key={m.materia + p.id} className="border-b border-borde">
                  <td className="py-1">
                    {m.materia} · {p.corta} {temaDe(p.etiqueta)}
                  </td>
                  <td>{num(p.estadisticos.media)} %</td>
                  <td>{num(p.dificultad, 2)}</td>
                  <td>{num(p.discriminacion, 2)}</td>
                  <td>{num(p.pctNoLogrado)} %</td>
                  <td>
                    {p.errores.conceptual}/{p.errores.procedimental}/{p.errores.descuido}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-tinta-3">p: índice de dificultad (0–1). D: discriminación (27 % superior − 27 % inferior). C/P/D: errores conceptuales, procedimentales y descuidos.</p>
      </section>

      <section className="sin-cortar">
        <h2 className="mb-2 text-sm font-semibold">5. Tipos de error</h2>
        <BarraErrores errores={g.errores} />
        <ul className="mt-2 space-y-0.5 text-[11px] text-tinta-2">
          {Object.values(TIPOS_ERROR).map((t) => (
            <li key={t.etiqueta}>
              <b>{t.etiqueta}:</b> {t.descripcion}
            </li>
          ))}
        </ul>
      </section>

      <section className="salto-pagina">
        <h2 className="mb-2 text-sm font-semibold">6. Estudiantes ({anonimo ? 'códigos anónimos' : 'nominal'})</h2>
        <table className="w-full text-[11px]">
          <thead className="border-b border-borde text-left text-tinta-3">
            <tr>
              <th className="py-1">#</th>
              <th>Estudiante</th>
              {analisis.materias.map((m) => (
                <th key={m.materia}>{m.materia.split(' ').slice(-1)[0]}</th>
              ))}
              <th>Global</th>
              <th>Nivel</th>
              <th>Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {analisis.estudiantes.map((e) => (
              <tr key={e.clave} className="border-b border-borde">
                <td className="py-0.5">{e.posicion}</td>
                <td>{nombreVisible(e, anonimo)}</td>
                {analisis.materias.map((m) => (
                  <td key={m.materia}>{num(e.materias.find((x) => x.materia === m.materia)?.pct)}</td>
                ))}
                <td className="font-semibold">{num(e.pctGlobal)}</td>
                <td>
                  <InsigniaNivel etiqueta={e.nivel.etiqueta} />
                </td>
                <td>{e.riesgo.nivel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
