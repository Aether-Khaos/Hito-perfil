'use client';
import { useMemo, useState } from 'react';
import { BarraApilada, Dona, DonaNiveles, ListaBarras, num } from './graficos';
import { InsigniaNivel, InsigniaRiesgo, PerfilDiagnosticoVista, TituloBloque } from './PerfilDiagnostico';
import { TIPOS_ERROR, csvEstudiante, csvGlobal, temaDe, type AnalisisHito, type ComparacionHitos, type HitoId } from '@/lib/analisis-hitos';
import { AZUL, ERROR_COLOR, GRIS, HITO_COLOR, NIVEL_COLOR, RIESGO } from '@/lib/paleta';

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function abrirReporte(params: Record<string, string>) {
  window.open(`/reporte?${new URLSearchParams(params).toString()}`, '_blank', 'noopener');
}

const archivoSeguro = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '_');

export function Tarjeta({ titulo, children, acciones, nota }: { titulo: string; children: React.ReactNode; acciones?: React.ReactNode; nota?: string }) {
  return (
    <section className="min-w-0 rounded border border-borde bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <TituloBloque>{titulo}</TituloBloque>
          {nota && <p className="text-xs text-tinta-3">{nota}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

function Kpi({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: string; nota?: string; tono?: string }) {
  return (
    <div className={`rounded border px-4 py-3 ${tono ?? 'border-borde bg-white'}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="mt-0.5 text-2xl font-bold text-tinta">{valor}</div>
      {nota && <div className="text-xs text-tinta-2">{nota}</div>}
    </div>
  );
}

export const Boton = ({ children, onClick, primario }: { children: React.ReactNode; onClick: () => void; primario?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      primario
        ? 'rounded bg-acento px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d63b0]'
        : 'rounded border border-[#ced4da] bg-white px-3 py-2 text-xs font-semibold text-tinta hover:border-acento hover:text-acento'
    }
  >
    {children}
  </button>
);

const SIGLA: Array<[string, string]> = [
  ['matem', 'Matemáticas'],
  ['program', 'Programación'],
  ['estructura', 'Estructuras'],
  ['ingl', 'Inglés'],
  ['logic', 'Lógica'],
];
export function nombreCorto(materia: string) {
  const n = materia.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return SIGLA.find(([k]) => n.includes(k))?.[1] ?? materia;
}

/* ============================ Resumen del curso ============================ */

function SelectorVista({ modo, cambiar }: { modo: 'tortas' | 'barras'; cambiar: (m: 'tortas' | 'barras') => void }) {
  return (
    <div className="inline-flex rounded border border-[#ced4da] bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Tipo de gráfico">
      {(['tortas', 'barras'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => cambiar(m)}
          aria-pressed={modo === m}
          className={`rounded px-3 py-1.5 ${modo === m ? 'bg-acento text-white' : 'text-tinta-2 hover:text-acento'}`}
        >
          {m === 'tortas' ? 'Tortas' : 'Barras'}
        </button>
      ))}
    </div>
  );
}

const colorPromedio = (v: number) => (v >= 51 ? '#15803d' : v >= 31 ? '#ea580c' : '#b91c1c');

export function ResumenGlobal({ analisis }: { analisis: AnalisisHito }) {
  const [modo, setModo] = useState<'tortas' | 'barras'>('tortas');
  const g = analisis.global;
  const segErrores = (['conceptual', 'procedimental', 'descuido'] as const).map((t) => ({ etiqueta: TIPOS_ERROR[t].etiqueta, valor: g.errores[t], color: ERROR_COLOR[t] }));
  const segNiveles = (conteos: Record<string, number>) => Object.entries(NIVEL_COLOR).map(([n, color]) => ({ etiqueta: n, valor: conteos[n] ?? 0, color }));
  const logrado = g.distribucion.Logrado + g.distribucion.Destacado + g.distribucion.Excepcional;
  const preguntasDificiles = analisis.materias
    .flatMap((m) => m.preguntas.map((p) => ({ m, p })))
    .sort((a, b) => b.p.pctNoLogrado - a.p.pctNoLogrado)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-tinta-2">
            Hito {analisis.hito} · {g.n} estudiantes · {analisis.materias.length} asignaturas
          </p>
          <span className="flex items-center gap-2 text-xs text-tinta-3">
            Ver gráficos como <SelectorVista modo={modo} cambiar={setModo} />
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton primario onClick={() => abrirReporte({ tipo: 'global', hito: analisis.hito })}>
            Descargar reporte del curso (PDF)
          </Boton>
          <Boton onClick={() => descargar(`reporte_curso_${analisis.hito}.csv`, csvGlobal(analisis, false))}>Datos en Excel</Boton>
          <Boton onClick={() => abrirReporte({ tipo: 'global', hito: analisis.hito, anonimo: '1' })}>PDF sin nombres (para presentar)</Boton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Promedio del curso" valor={`${num(g.estadisticos.media, 0)} %`} nota="de las cinco asignaturas" />
        <Kpi etiqueta="Alcanzan el nivel esperado" valor={`${logrado} de ${g.n}`} nota="51 % o más" tono="border-green-200 bg-green-50" />
        <Kpi etiqueta="Necesitan apoyo urgente" valor={String(g.riesgo.alto)} nota={`y ${g.riesgo.medio} necesitan seguimiento`} tono="border-red-200 bg-red-50" />
        <Kpi
          etiqueta="De la 1.ª a la 3.ª evaluación"
          valor={`${g.progresoInterno.mejoran} mejoraron`}
          nota={`${g.progresoInterno.retroceden} bajaron · ${g.progresoInterno.estables} igual`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Promedio por asignatura" nota="Verde: llega al nivel esperado (51 %). Naranja: en proceso. Rojo: necesita apoyo.">
          {modo === 'tortas' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...analisis.materias]
                .sort((a, b) => b.estadisticos.media - a.estadisticos.media)
                .map((m) => (
                  <div key={m.materia} className="flex flex-col items-center gap-1.5 rounded border border-borde bg-[#f8f9fa] p-3">
                    <Dona
                      leyenda={false}
                      tamano={104}
                      grosor={16}
                      centroValor={`${num(m.estadisticos.media, 0)}%`}
                      segmentos={[
                        { etiqueta: 'Promedio', valor: m.estadisticos.media, color: colorPromedio(m.estadisticos.media) },
                        { etiqueta: 'Resto', valor: 100 - m.estadisticos.media, color: '#e9ecef' },
                      ]}
                    />
                    <p className="text-center text-xs font-bold leading-tight text-tinta">{nombreCorto(m.materia)}</p>
                    <p className="text-center text-[10px] text-tinta-3">{num(m.pctLogradoOMas, 0)} % llega al 51 %</p>
                  </div>
                ))}
            </div>
          ) : (
            <ListaBarras
              items={[...analisis.materias]
                .sort((a, b) => b.estadisticos.media - a.estadisticos.media)
                .map((m) => ({
                  etiqueta: m.materia,
                  valor: m.estadisticos.media,
                  color: colorPromedio(m.estadisticos.media),
                  nota: `${num(m.pctLogradoOMas, 0)} % del curso alcanza el nivel esperado`,
                }))}
            />
          )}
        </Tarjeta>
        <Tarjeta titulo="¿Cómo está el curso?" nota="Estudiantes según su promedio general.">
          {modo === 'tortas' ? <DonaNiveles conteos={g.distribucion} tamano={170} /> : <BarraApilada segmentos={segNiveles(g.distribucion)} />}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Nivel por asignatura" nota="Cuántos estudiantes hay en cada nivel, por asignatura.">
        {modo === 'tortas' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {analisis.materias.map((m) => (
            <div key={m.materia} className="flex flex-col items-center gap-2 rounded border border-borde bg-[#f8f9fa] p-4">
              <p className="text-center text-sm font-bold text-tinta">{m.materia}</p>
              <Dona
                leyenda={false}
                tamano={128}
                grosor={20}
                centroValor={`${num(m.estadisticos.media, 0)}%`}
                centroEtiqueta="promedio"
                segmentos={Object.entries(NIVEL_COLOR).map(([n, color]) => ({ etiqueta: n, valor: m.distribucion[n] ?? 0, color }))}
              />
              <p className="text-center text-[11px] text-tinta-2">
                {m.distribucion.Inicio} en Inicio · {m.distribucion.Logrado + m.distribucion.Destacado + m.distribucion.Excepcional} en Logrado o más
              </p>
            </div>
          ))}
        </div>
        ) : (
          <div className="space-y-4">
            {analisis.materias.map((m) => (
              <div key={m.materia}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-tinta">{m.materia}</span>
                  <span className="text-xs text-tinta-3">promedio {num(m.estadisticos.media, 0)} %</span>
                </div>
                <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded">
                  {Object.entries(NIVEL_COLOR).map(([n, c]) =>
                    (m.distribucion[n] ?? 0) > 0 ? (
                      <div
                        key={n}
                        title={`${n}: ${m.distribucion[n]}`}
                        className="flex items-center justify-center text-[11px] font-semibold"
                        style={{ flex: m.distribucion[n], background: c, color: n === 'Logrado' ? '#212529' : '#fff' }}
                      >
                        {m.distribucion[n]}
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
          {Object.entries(NIVEL_COLOR).map(([n, c]) => (
            <span key={n} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
              {n}
            </span>
          ))}
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Preguntas más difíciles" nota="Porcentaje de estudiantes que no llegaron al 51 % en esa pregunta.">
          {modo === 'tortas' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {preguntasDificiles.map(({ m, p }) => (
                <div key={m.materia + p.id} className="flex flex-col items-center gap-1.5 rounded border border-borde bg-[#f8f9fa] p-3">
                  <Dona
                    leyenda={false}
                    tamano={96}
                    grosor={14}
                    centroValor={`${num(p.pctNoLogrado, 0)}%`}
                    segmentos={[
                      { etiqueta: 'No llegaron al 51 %', valor: p.pctNoLogrado, color: '#b91c1c' },
                      { etiqueta: 'Llegaron', valor: 100 - p.pctNoLogrado, color: '#e9ecef' },
                    ]}
                  />
                  <p className="text-center text-xs font-bold text-tinta">
                    {nombreCorto(m.materia)} · {p.corta}
                  </p>
                  <p className="text-center text-[10px] leading-tight text-tinta-2">{temaDe(p.etiqueta)}</p>
                </div>
              ))}
            </div>
          ) : (
            <ListaBarras
              meta={null}
              color="#b91c1c"
              items={preguntasDificiles.map(({ m, p }) => ({
                etiqueta: `${nombreCorto(m.materia)} ${p.corta + ' '}· ${temaDe(p.etiqueta)}`,
                valor: p.pctNoLogrado,
              }))}
            />
          )}
        </Tarjeta>
        <Tarjeta titulo="¿Por qué se equivocan?" nota="Todas las respuestas que no fueron correctas, según el puntaje.">
          {modo === 'tortas' ? <Dona tamano={160} centroValor={String(segErrores.reduce((a, x) => a + x.valor, 0))} centroEtiqueta="respuestas" segmentos={segErrores} /> : <BarraApilada segmentos={segErrores} />}
          <ul className="mt-4 space-y-1.5 text-sm text-tinta-2">
            {(['conceptual', 'procedimental', 'descuido'] as const).map((t) => (
              <li key={t}>
                <b style={{ color: ERROR_COLOR[t] }}>{TIPOS_ERROR[t].etiqueta}:</b> {TIPOS_ERROR[t].descripcion}
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      {analisis.advertencias.length > 0 && (
        <details className="rounded border border-borde bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-tinta">Avisos sobre los datos ({analisis.advertencias.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-tinta-2">
            {analisis.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* ============================ Por asignatura ============================ */

export function VistaMaterias({ analisis }: { analisis: AnalisisHito }) {
  const [activa, setActiva] = useState(analisis.materias[0]?.materia ?? '');
  const m = analisis.materias.find((x) => x.materia === activa) ?? analisis.materias[0];
  const ranking = useMemo(
    () =>
      analisis.estudiantes
        .map((e) => ({ e, mm: e.materias.find((x) => x.materia === m?.materia) }))
        .filter((x) => x.mm)
        .sort((a, b) => b.mm!.pct - a.mm!.pct),
    [analisis, m],
  );
  if (!m) return null;
  const facil = (p: number) => (p >= 0.6 ? 'Fácil' : p >= 0.35 ? 'Intermedia' : p >= 0.2 ? 'Difícil' : 'Muy difícil');

  return (
    <div className="space-y-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {analisis.materias.map((x) => (
          <button
            key={x.materia}
            onClick={() => setActiva(x.materia)}
            className={`shrink-0 rounded border px-3 py-1.5 text-xs font-semibold ${
              x.materia === m.materia ? 'border-acento bg-acento text-white' : 'border-[#ced4da] bg-white text-tinta hover:border-acento'
            }`}
          >
            {x.materia}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Promedio" valor={`${num(m.estadisticos.media, 0)} %`} nota={`la mitad del curso tiene ${num(m.estadisticos.mediana, 0)} % o menos`} />
        <Kpi etiqueta="Alcanzan el nivel esperado" valor={`${num(m.pctLogradoOMas, 0)} %`} nota={`de ${m.estadisticos.n} estudiantes`} tono="border-green-200 bg-green-50" />
        <Kpi etiqueta="Con menos de 31 %" valor={String(m.enRiesgo)} nota="estudiantes en Inicio" tono="border-red-200 bg-red-50" />
        <Kpi etiqueta="Nota más alta y más baja" valor={`${num(m.estadisticos.max, 0)} / ${num(m.estadisticos.min, 0)}`} nota="en porcentaje" />
      </div>

      <Tarjeta titulo={`Promedio del curso por pregunta · ${m.materia}`} nota="Cada dona muestra qué parte del puntaje obtuvo, en promedio, el curso.">
        <div className={`grid gap-4 ${m.preguntas.length === 1 ? 'grid-cols-1 sm:max-w-sm' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {m.preguntas.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded border border-borde bg-[#f8f9fa] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-acento">{p.corta}</span>
                <span className="rounded border border-[#ced4da] bg-white px-2 py-0.5 text-[10px] font-bold text-tinta">{facil(p.dificultad)}</span>
              </div>
              <div className="flex justify-center">
                <Dona
                  leyenda={false}
                  tamano={132}
                  grosor={18}
                  centroValor={`${num(p.estadisticos.media, 0)}%`}
                  centroEtiqueta="promedio"
                  segmentos={[
                    { etiqueta: 'Promedio obtenido', valor: p.estadisticos.media, color: AZUL },
                    { etiqueta: 'Puntaje no obtenido', valor: 100 - p.estadisticos.media, color: '#e9ecef' },
                  ]}
                />
              </div>
              <div className="border-t border-borde pt-2 text-center">
                <span className="block text-[10px] font-bold uppercase text-tinta-3">Tema evaluado</span>
                <p className="text-xs font-semibold text-tinta">{temaDe(p.etiqueta)}</p>
                <p className="mt-1 text-[11px] text-tinta-2">
                  {num(p.pctNoLogrado, 0)} % no llegó al 51 % · vale {p.max} pts
                </p>
              </div>
            </div>
          ))}
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-acento">Ver detalle técnico (para investigación)</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="text-left text-tinta-3">
                <tr>
                  <th className="py-1.5 pr-3">Pregunta</th>
                  <th className="px-2">Dificultad p</th>
                  <th className="px-2">Discriminación D</th>
                  <th className="px-2">Concepto / Procedimiento / Descuido</th>
                </tr>
              </thead>
              <tbody>
                {m.preguntas.map((p) => (
                  <tr key={p.id} className="border-t border-borde">
                    <td className="py-1.5 pr-3">
                      {p.corta} · {temaDe(p.etiqueta)}
                    </td>
                    <td className="px-2">{num(p.dificultad, 2)}</td>
                    <td className="px-2">{num(p.discriminacion, 2)}</td>
                    <td className="px-2">
                      {p.errores.conceptual} / {p.errores.procedimental} / {p.errores.descuido}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-tinta-3">p: proporción media del puntaje (0–1). D: diferencia entre el 27 % con mejor y peor nota de la asignatura.</p>
          </div>
        </details>
      </Tarjeta>

      <Tarjeta titulo="Ranking de la asignatura">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-[10px] font-bold uppercase tracking-wide text-tinta-3">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Estudiante</th>
                {m.preguntas.map((p) => (
                  <th key={p.id} className="px-2 py-2">
                    {p.corta}
                  </th>
                ))}
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(({ e, mm }, i) => (
                <tr key={e.clave} className="border-t border-borde">
                  <td className="py-1.5 pr-2 text-tinta-3">{i + 1}</td>
                  <td className="py-1.5 pr-2">{e.nombre}</td>
                  {mm!.preguntas.map((p) => (
                    <td key={p.id} className={`px-2 py-1.5 tabular-nums ${p.estado === 'no_lograda' ? 'font-semibold text-red-700' : ''}`}>
                      {num(p.pct, 0)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 font-semibold tabular-nums">{num(mm!.pct, 0)} %</td>
                  <td className="px-2 py-1.5">
                    <InsigniaNivel etiqueta={mm!.nivel.etiqueta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-tinta-3">En rojo, las preguntas con menos de 51 %.</p>
      </Tarjeta>
    </div>
  );
}

/* ============================ Por estudiante ============================ */

export function VistaEstudiantes({ analisis, comparacion }: { analisis: AnalisisHito; comparacion: ComparacionHitos | null }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'alto' | 'medio' | 'bajo'>('todos');
  const [clave, setClave] = useState(analisis.estudiantes[0]?.clave ?? '');
  const lista = analisis.estudiantes.filter(
    (e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (filtro === 'todos' || e.riesgo.nivel === filtro),
  );
  const perfil = analisis.estudiantes.find((e) => e.clave === clave) ?? lista[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Celular y tableta: selector compacto */}
      <div className="space-y-2 lg:hidden">
        <label className="text-xs font-bold uppercase text-tinta-2">Elegir estudiante</label>
        <select
          value={perfil?.clave ?? ''}
          onChange={(e) => setClave(e.target.value)}
          className="w-full rounded border border-[#ced4da] bg-white px-3 py-2.5 text-sm"
        >
          {analisis.estudiantes.map((e) => (
            <option key={e.clave} value={e.clave}>
              {e.posicion}. {e.nombre} — {num(e.pctGlobal, 0)} %
            </option>
          ))}
        </select>
      </div>

      {/* Escritorio: lista al lado del perfil */}
      <aside className="hidden overflow-hidden rounded border border-borde bg-white lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="space-y-2 border-b border-borde bg-[#f8f9fa] p-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar estudiante…"
            className="w-full rounded border border-[#ced4da] bg-white px-3 py-2 text-sm focus:border-acento focus:outline-none"
          />
          <div className="flex flex-wrap gap-1 text-[11px]">
            {(['todos', 'alto', 'medio', 'bajo'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFiltro(r)}
                className={`rounded border px-2 py-0.5 font-semibold ${filtro === r ? 'border-acento bg-acento text-white' : 'border-[#ced4da] bg-white text-tinta-2'}`}
              >
                {r === 'todos' ? 'Todos' : RIESGO[r].etiqueta}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {lista.map((e) => (
            <li key={e.clave}>
              <button
                onClick={() => setClave(e.clave)}
                className={`flex w-full items-center gap-3 border-b border-borde px-3 py-2.5 text-left text-sm hover:bg-[#f1f5fb] ${
                  perfil?.clave === e.clave ? 'border-l-4 border-l-acento bg-acento-suave' : ''
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RIESGO[e.riesgo.nivel].color }} title={RIESGO[e.riesgo.nivel].etiqueta} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-tinta">{e.nombre}</span>
                  <span className="text-[11px] text-tinta-3">
                    Puesto {e.posicion} · {e.nivel.etiqueta}
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums text-tinta">{num(e.pctGlobal, 0)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        {perfil ? (
          <>
            <div className="no-imprimir mb-4 flex flex-wrap gap-2 sm:justify-end">
              <Boton primario onClick={() => abrirReporte({ tipo: 'estudiante', hito: analisis.hito, clave: perfil.clave })}>
                Descargar reporte del estudiante (PDF)
              </Boton>
              <Boton onClick={() => descargar(`perfil_${archivoSeguro(perfil.nombre)}_${analisis.hito}.csv`, csvEstudiante(analisis, perfil, false))}>
                Datos en Excel
              </Boton>
            </div>
            <PerfilDiagnosticoVista analisis={analisis} perfil={perfil} comparacion={comparacion} />
          </>
        ) : (
          <p className="text-sm text-tinta-2">Ningún estudiante coincide con la búsqueda.</p>
        )}
      </div>
    </div>
  );
}

/* ============================ Progresión ============================ */

export function VistaProgresion({ analisisPorHito, comparacion }: { analisisPorHito: Partial<Record<HitoId, AnalisisHito>>; comparacion: ComparacionHitos | null }) {
  const cargados = Object.values(analisisPorHito).filter(Boolean) as AnalisisHito[];
  const base = cargados[0];

  if (!comparacion) {
    return (
      <div className="space-y-6">
        <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">Falta un hito para comparar</h4>
          <p className="text-sm text-tinta">
            Hitos cargados: <b>{cargados.map((a) => a.hito).join(', ') || 'ninguno'}</b>. Cuando cargues el Hito Intermedio o el Final, aquí verás quién mejoró, quién bajó y qué temas ya superó cada estudiante.
          </p>
        </div>
        {base && (
          <Tarjeta titulo={`Dentro del Hito ${base.hito}: de la 1.ª a la 3.ª evaluación`} nota="Cambio entre la primera y la tercera pregunta, en las asignaturas que tienen tres.">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Dona
                tamano={160}
                centroValor={`${base.global.progresoInterno.media !== null && base.global.progresoInterno.media > 0 ? '+' : ''}${num(base.global.progresoInterno.media, 1)}`}
                centroEtiqueta="pts en promedio"
                segmentos={[
                  { etiqueta: 'Mejoraron (más de 2 pts)', valor: base.global.progresoInterno.mejoran, color: '#15803d' },
                  { etiqueta: 'Se mantuvieron', valor: base.global.progresoInterno.estables, color: GRIS },
                  { etiqueta: 'Bajaron (más de 2 pts)', valor: base.global.progresoInterno.retroceden, color: '#b91c1c' },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-tinta-3">Cada evaluación trata un tema distinto, así que este cambio describe el examen, no un aprendizaje.</p>
          </Tarjeta>
        )}
      </div>
    );
  }

  const r = comparacion.resumen;
  const desde = comparacion.hitos[0];
  const hasta = comparacion.hitos[comparacion.hitos.length - 1];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Cambio promedio" valor={`${(r.deltaMedio ?? 0) > 0 ? '+' : ''}${num(r.deltaMedio, 1)} pts`} nota={`${desde} → ${hasta}`} />
        <Kpi etiqueta="Mejoraron" valor={String(r.mejoran)} nota="más de 2 pts" tono="border-green-200 bg-green-50" />
        <Kpi etiqueta="Bajaron" valor={String(r.retroceden)} nota="más de 2 pts" tono="border-red-200 bg-red-50" />
        <Kpi etiqueta="Llegaron al nivel esperado" valor={String(r.cruzanUmbral)} nota="pasaron a 51 % o más" />
      </div>
      <Tarjeta titulo="Promedio del curso en cada hito">
        <div className="space-y-4">
          {comparacion.materias.map((m) => (
            <div key={m.materia}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-tinta">{m.materia}</span>
                <span className={`font-semibold ${(m.delta ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {m.delta === null ? '—' : `${m.delta > 0 ? '+' : ''}${num(m.delta, 1)} pts`}
                </span>
              </div>
              <div className="space-y-1">
                {m.medias.map((x) => (
                  <div key={x.hito} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-tinta-3">{x.hito}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-[#e9ecef]">
                      <div className="h-full rounded-full" style={{ width: `${x.media ?? 0}%`, background: HITO_COLOR[x.hito] }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums">{num(x.media, 0)} %</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Avance por estudiante">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-[10px] font-bold uppercase tracking-wide text-tinta-3">
              <tr>
                <th className="py-2 pr-2">Estudiante</th>
                {comparacion.hitos.map((h) => (
                  <th key={h} className="px-2 py-2">
                    {h}
                  </th>
                ))}
                <th className="px-2 py-2">Cambio</th>
                <th className="px-2 py-2">Temas superados</th>
              </tr>
            </thead>
            <tbody>
              {comparacion.estudiantes.map((e) => (
                <tr key={e.clave} className="border-t border-borde">
                  <td className="py-1.5 pr-2">{e.nombre}</td>
                  {e.puntos.map((p) => (
                    <td key={p.hito} className="px-2 py-1.5 tabular-nums">
                      {num(p.pct, 0)}
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 font-semibold ${e.tendencia === 'mejora' ? 'text-green-700' : e.tendencia === 'retroceso' ? 'text-red-700' : ''}`}>
                    {e.delta === null ? '—' : `${e.delta > 0 ? '▲ +' : e.delta < 0 ? '▼ ' : ''}${num(e.delta, 0)}`}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-tinta-2">{e.brechasRecuperadas.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}

export { InsigniaRiesgo };
