'use client';
import { useMemo, useState } from 'react';
import { BarraErrores, BarrasDominio, CajasBigotes, DistribucionNiveles, LineasHitos, num } from './graficos';
import { InsigniaNivel, InsigniaRiesgo, PerfilDiagnosticoVista, nombreVisible } from './PerfilDiagnostico';
import {
  TIPOS_ERROR,
  csvEstudiante,
  csvGlobal,
  temaDe,
  type AnalisisHito,
  type ComparacionHitos,
  type HitoId,
} from '@/lib/analisis-hitos';
import { HITO_COLOR } from '@/lib/paleta';

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

/** Sigla corta para etiquetas de gráficos (MAT, PRO, EST, ING, LOG). */
export function siglaMateria(materia: string) {
  const n = materia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (n.includes('matem')) return 'MAT';
  if (n.includes('program')) return 'PRO';
  if (n.includes('estructura')) return 'EST';
  if (n.includes('ingl')) return 'ING';
  if (n.includes('logic')) return 'LOG';
  return materia.slice(0, 3).toUpperCase();
}

const archivoSeguro = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '_');

export function Tarjeta({ titulo, children, acciones, nota }: { titulo: string; children: React.ReactNode; acciones?: React.ReactNode; nota?: string }) {
  return (
    <section className="rounded-xl border border-borde bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-tinta">{titulo}</h2>
          {nota && <p className="text-xs text-tinta-2">{nota}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

function Kpi({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-borde bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="mt-0.5 text-2xl font-semibold text-tinta">{valor}</div>
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
        ? 'rounded-lg bg-acento px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#184f95]'
        : 'rounded-lg border border-borde bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:border-acento hover:text-acento'
    }
  >
    {children}
  </button>
);

/* ============================ Resumen global ============================ */

export function ResumenGlobal({ analisis, anonimo }: { analisis: AnalisisHito; anonimo: boolean }) {
  const g = analisis.global;
  const pi = g.progresoInterno;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-2">
          Hito {analisis.hito} · {analisis.archivos.join(', ')}
        </p>
        <div className="flex gap-2">
          <Boton onClick={() => abrirReporte({ tipo: 'global', hito: analisis.hito, anonimo: anonimo ? '1' : '0' })} primario>
            Reporte global (PDF)
          </Boton>
          <Boton onClick={() => descargar(`reporte_global_${analisis.hito}.csv`, csvGlobal(analisis, anonimo))}>Datos (Excel/CSV)</Boton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiqueta="Estudiantes" valor={String(g.n)} nota={`${analisis.materias.length} asignaturas`} />
        <Kpi etiqueta="Dominio medio" valor={`${num(g.estadisticos.media)} %`} nota={`mediana ${num(g.estadisticos.mediana)} %`} />
        <Kpi etiqueta="Logrado o más" valor={String(g.distribucion.Logrado + g.distribucion.Destacado + g.distribucion.Excepcional)} nota={`de ${g.n} estudiantes`} />
        <Kpi etiqueta="Riesgo alto" valor={String(g.riesgo.alto)} nota={`${g.riesgo.medio} en riesgo medio`} />
        <Kpi
          etiqueta="P1 → P3"
          valor={pi.media === null ? '—' : `${pi.media > 0 ? '+' : ''}${num(pi.media)} pp`}
          nota={`${pi.mejoran} mejoran · ${pi.retroceden} retroceden`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Dominio medio por asignatura" nota="Promedio de los porcentajes individuales, ponderado por los máximos de cada pregunta.">
          <BarrasDominio
            items={analisis.materias.map((m) => ({
              etiqueta: m.materia,
              valor: m.estadisticos.media,
              detalle: `${num(m.pctLogradoOMas)} % en Logrado o más · n = ${m.estadisticos.n}`,
            }))}
          />
        </Tarjeta>
        <Tarjeta titulo="Distribución por nivel de logro" nota="Escala institucional UAB de cinco niveles.">
          <DistribucionNiveles filas={analisis.materias.map((m) => ({ etiqueta: m.materia, conteos: m.distribucion }))} />
        </Tarjeta>
        <Tarjeta titulo="Dispersión por asignatura" nota="Diagramas de caja: dónde se concentra la cohorte y cuánto varía.">
          <CajasBigotes filas={analisis.materias.map((m) => ({ etiqueta: m.materia, est: m.estadisticos }))} />
        </Tarjeta>
        <Tarjeta titulo="Tipos de error en la cohorte" nota="Preguntas no correctas clasificadas por banda de puntaje.">
          <BarraErrores errores={g.errores} />
          <ul className="mt-3 space-y-1 text-xs text-tinta-2">
            {Object.values(TIPOS_ERROR).map((t) => (
              <li key={t.etiqueta}>
                <b className="text-tinta">{t.etiqueta}:</b> {t.descripcion}
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Preguntas con menor evidencia de logro" nota="Porcentaje de estudiantes por debajo del nivel Logrado en cada pregunta.">
        <BarrasDominio
          color="#eb6834"
          umbral={50}
          etiquetaUmbral="Mitad de la cohorte"
          anchoEtiqueta={290}
          items={analisis.materias
            .flatMap((m) => m.preguntas.map((p) => ({ m, p })))
            .sort((a, b) => b.p.pctNoLogrado - a.p.pctNoLogrado)
            .slice(0, 8)
            .map(({ m, p }) => ({
              etiqueta: `${siglaMateria(m.materia)} ${p.corta} · ${temaDe(p.etiqueta)}`,
              valor: p.pctNoLogrado,
              detalle: `${m.materia} · dificultad p = ${num(p.dificultad, 2)}`,
            }))}
        />
      </Tarjeta>

      {analisis.advertencias.length > 0 && (
        <Tarjeta titulo="Calidad de los datos">
          <ul className="list-disc space-y-1 pl-5 text-xs text-tinta-2">
            {analisis.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

/* ============================ Por asignatura ============================ */

export function VistaMaterias({ analisis, anonimo }: { analisis: AnalisisHito; anonimo: boolean }) {
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
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {analisis.materias.map((x) => (
          <button
            key={x.materia}
            onClick={() => setActiva(x.materia)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              x.materia === m.materia ? 'border-acento bg-acento text-white' : 'border-borde bg-white text-tinta hover:border-acento'
            }`}
          >
            {x.materia}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiqueta="Media" valor={`${num(m.estadisticos.media)} %`} nota={`DE ${num(m.estadisticos.de)}`} />
        <Kpi etiqueta="Mediana" valor={`${num(m.estadisticos.mediana)} %`} nota={`Q1 ${num(m.estadisticos.q1)} · Q3 ${num(m.estadisticos.q3)}`} />
        <Kpi etiqueta="Logrado o más" valor={`${num(m.pctLogradoOMas)} %`} nota={`n = ${m.estadisticos.n}`} />
        <Kpi etiqueta="En nivel Inicio" valor={String(m.enRiesgo)} nota="dominio < 31 %" />
        <Kpi etiqueta="Rango" valor={`${num(m.estadisticos.min, 0)}–${num(m.estadisticos.max, 0)}`} nota="mínimo y máximo" />
      </div>

      <Tarjeta titulo={`Análisis por pregunta · ${m.materia}`} nota={m.instrumento ?? undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-tinta-3">
              <tr>
                <th className="py-2 pr-3 font-medium">Pregunta</th>
                <th className="px-2 py-2 font-medium">Máx.</th>
                <th className="px-2 py-2 font-medium">Media</th>
                <th className="px-2 py-2 font-medium" title="Índice de dificultad: proporción media del puntaje (0 = nadie acierta, 1 = todos aciertan)">
                  Dificultad p
                </th>
                <th className="px-2 py-2 font-medium" title="Índice de discriminación: p del 27 % superior − p del 27 % inferior">
                  Discriminación D
                </th>
                <th className="px-2 py-2 font-medium">No logrado</th>
                <th className="px-2 py-2 font-medium">Conceptual / Proced. / Descuido</th>
              </tr>
            </thead>
            <tbody>
              {m.preguntas.map((p) => (
                <tr key={p.id} className="border-t border-borde align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-tinta">
                      {p.corta} · {temaDe(p.etiqueta)}
                    </div>
                    <div className="text-xs text-tinta-2">{p.competencias.slice(0, 4).join('; ')}{p.competencias.length > 4 ? '…' : ''}</div>
                  </td>
                  <td className="px-2 py-2">{p.max}</td>
                  <td className="whitespace-nowrap px-2 py-2">{num(p.estadisticos.media)} %</td>
                  <td className="px-2 py-2">
                    {num(p.dificultad, 2)}
                    <div className="text-[11px] text-tinta-3">{p.dificultad < 0.3 ? 'difícil' : p.dificultad > 0.7 ? 'fácil' : 'media'}</div>
                  </td>
                  <td className="px-2 py-2">
                    {num(p.discriminacion, 2)}
                    <div className="text-[11px] text-tinta-3">
                      {p.discriminacion === null ? 'una sola pregunta' : p.discriminacion >= 0.4 ? 'muy buena' : p.discriminacion >= 0.3 ? 'buena' : p.discriminacion >= 0.2 ? 'aceptable' : 'revisar'}
                    </div>
                  </td>
                  <td className="px-2 py-2">{num(p.pctNoLogrado)} %</td>
                  <td className="px-2 py-2 text-xs">
                    {p.errores.conceptual} / {p.errores.procedimental} / {p.errores.descuido}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {m.evolucionInterna.length > 1 && (
          <p className="mt-3 text-xs text-tinta-2">
            Evolución dentro del hito: {m.evolucionInterna.map((e) => `${e.corta} ${num(e.media)} %`).join(' → ')}. Cada pregunta evalúa un contenido distinto, así que la
            variación describe el instrumento y no un efecto de aprendizaje.
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Ranking de la asignatura">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wide text-tinta-3">
              <tr>
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Estudiante</th>
                {m.preguntas.map((p) => (
                  <th key={p.id} className="px-2 py-2 font-medium">
                    {p.corta}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Dominio</th>
                <th className="px-2 py-2 font-medium">Nivel</th>
                <th className="px-2 py-2 font-medium">Cuartil</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(({ e, mm }, i) => (
                <tr key={e.clave} className="border-t border-borde">
                  <td className="py-1.5 pr-2 text-tinta-3">{i + 1}</td>
                  <td className="py-1.5 pr-2">{nombreVisible(e, anonimo)}</td>
                  {mm!.preguntas.map((p) => (
                    <td key={p.id} className={`px-2 py-1.5 ${p.estado === 'no_lograda' ? 'font-semibold text-[#b42318]' : ''}`}>
                      {num(p.pct, 0)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 font-medium">{num(mm!.pct)} %</td>
                  <td className="px-2 py-1.5">
                    <InsigniaNivel etiqueta={mm!.nivel.etiqueta} />
                  </td>
                  <td className="px-2 py-1.5">Q{mm!.cuartil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}

/* ============================ Por estudiante ============================ */

export function VistaEstudiantes({
  analisis,
  anonimo,
  comparacion,
}: {
  analisis: AnalisisHito;
  anonimo: boolean;
  comparacion: ComparacionHitos | null;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<'todos' | 'alto' | 'medio' | 'bajo'>('todos');
  const [clave, setClave] = useState(analisis.estudiantes[0]?.clave ?? '');
  const lista = analisis.estudiantes.filter((e) => {
    const texto = `${e.codigo} ${anonimo ? '' : e.nombre}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtroRiesgo === 'todos' || e.riesgo.nivel === filtroRiesgo);
  });
  const perfil = analisis.estudiantes.find((e) => e.clave === clave) ?? lista[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-borde bg-white lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden lg:flex lg:flex-col">
        <div className="space-y-2 border-b border-borde p-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={anonimo ? 'Buscar por código…' : 'Buscar por nombre o código…'}
            className="w-full rounded-lg border border-borde px-3 py-2 text-sm focus:border-acento focus:outline-none"
          />
          <div className="flex gap-1 text-xs">
            {(['todos', 'alto', 'medio', 'bajo'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFiltroRiesgo(r)}
                className={`rounded-full border px-2 py-0.5 ${filtroRiesgo === r ? 'border-acento bg-acento-suave text-acento' : 'border-borde text-tinta-2'}`}
              >
                {r === 'todos' ? 'Todos' : `Riesgo ${r}`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-tinta-3">{lista.length} estudiante(s) · ordenados por dominio global</p>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto lg:max-h-none lg:flex-1">
          {lista.map((e) => (
            <li key={e.clave}>
              <button
                onClick={() => setClave(e.clave)}
                className={`flex w-full items-center justify-between gap-2 border-b border-borde px-3 py-2 text-left text-sm hover:bg-[#f4f7fb] ${
                  perfil?.clave === e.clave ? 'bg-acento-suave' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-tinta">
                    <span className="mr-1.5 text-tinta-3">{e.posicion}.</span>
                    {nombreVisible(e, anonimo)}
                  </span>
                  <span className="text-[11px] text-tinta-2">
                    {e.nivel.etiqueta} · {e.riesgo.nivel === 'bajo' ? 'riesgo bajo' : `riesgo ${e.riesgo.nivel}`}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-tinta">{num(e.pctGlobal)} %</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 rounded-xl border border-borde bg-white p-5">
        {perfil ? (
          <>
            <div className="no-imprimir mb-4 flex flex-wrap justify-end gap-2">
              <Boton
                primario
                onClick={() => abrirReporte({ tipo: 'estudiante', hito: analisis.hito, clave: perfil.clave, anonimo: anonimo ? '1' : '0' })}
              >
                Descargar reporte individual (PDF)
              </Boton>
              <Boton
                onClick={() =>
                  descargar(
                    `perfil_${archivoSeguro(anonimo ? perfil.codigo : perfil.nombre)}_${analisis.hito}.csv`,
                    csvEstudiante(analisis, perfil, anonimo),
                  )
                }
              >
                Datos (CSV)
              </Boton>
            </div>
            <PerfilDiagnosticoVista analisis={analisis} perfil={perfil} anonimo={anonimo} comparacion={comparacion} />
          </>
        ) : (
          <p className="text-sm text-tinta-2">Ningún estudiante coincide con el filtro.</p>
        )}
      </div>
    </div>
  );
}

/* ============================ Progresión ============================ */

export function VistaProgresion({
  analisisPorHito,
  comparacion,
  anonimo,
}: {
  analisisPorHito: Partial<Record<HitoId, AnalisisHito>>;
  comparacion: ComparacionHitos | null;
  anonimo: boolean;
}) {
  const cargados = Object.values(analisisPorHito).filter(Boolean) as AnalisisHito[];
  const base = cargados[0];

  if (!comparacion) {
    return (
      <div className="space-y-5">
        <Tarjeta
          titulo="Progresión entre hitos"
          nota="La comparación Inicial → Intermedio → Final se activa al cargar el libro de un segundo hito con el selector de la parte superior."
        >
          <p className="text-sm text-tinta-2">
            Hitos cargados: <b className="text-tinta">{cargados.map((a) => a.hito).join(', ') || 'ninguno'}</b>. Mientras tanto se muestra la línea base y el progreso dentro del
            hito (primera → tercera pregunta), que sirve de referencia para la medición longitudinal.
          </p>
        </Tarjeta>
        {base && (
          <Tarjeta titulo={`Progreso dentro del Hito ${base.hito} (P1 → P3)`} nota="Diferencia entre el dominio de la tercera y la primera pregunta, promediada entre asignaturas con tres preguntas.">
            <div className="grid grid-cols-3 gap-3">
              <Kpi etiqueta="Mejoran (> +2 pp)" valor={String(base.global.progresoInterno.mejoran)} />
              <Kpi etiqueta="Estables" valor={String(base.global.progresoInterno.estables)} />
              <Kpi etiqueta="Retroceden (< −2 pp)" valor={String(base.global.progresoInterno.retroceden)} />
            </div>
            <p className="mt-3 text-xs text-tinta-2">
              Variación media {num(base.global.progresoInterno.media, 2)} pp · mediana {num(base.global.progresoInterno.mediana, 2)} pp. Es descriptiva: cada pregunta evalúa
              contenidos distintos.
            </p>
          </Tarjeta>
        )}
      </div>
    );
  }

  const r = comparacion.resumen;
  const desde = comparacion.hitos[0];
  const hasta = comparacion.hitos[comparacion.hitos.length - 1];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiqueta="Comparados" valor={String(r.comparados)} nota={`${desde} → ${hasta}`} />
        <Kpi etiqueta="Variación media" valor={`${(r.deltaMedio ?? 0) > 0 ? '+' : ''}${num(r.deltaMedio)} pp`} />
        <Kpi etiqueta="Mejoran" valor={String(r.mejoran)} nota="> +2 pp" />
        <Kpi etiqueta="Retroceden" valor={String(r.retroceden)} nota="< −2 pp" />
        <Kpi etiqueta="Cruzan a Logrado" valor={String(r.cruzanUmbral)} nota="desde < 51 %" />
      </div>
      <Tarjeta titulo="Media de la cohorte por asignatura en cada hito">
        <LineasHitos hitos={comparacion.hitos} series={comparacion.materias.map((m) => ({ etiqueta: m.materia, puntos: m.medias.map((x) => x.media) }))} />
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-tinta-2">
          {comparacion.hitos.map((h) => (
            <span key={h} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: HITO_COLOR[h] }} />
              {h}
            </span>
          ))}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Progreso por estudiante">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wide text-tinta-3">
              <tr>
                <th className="py-2 pr-2 font-medium">Estudiante</th>
                {comparacion.hitos.map((h) => (
                  <th key={h} className="px-2 py-2 font-medium">
                    {h}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Δ</th>
                <th className="px-2 py-2 font-medium">Tendencia</th>
                <th className="px-2 py-2 font-medium">Brechas recuperadas / nuevas</th>
              </tr>
            </thead>
            <tbody>
              {comparacion.estudiantes.map((e) => (
                <tr key={e.clave} className="border-t border-borde">
                  <td className="py-1.5 pr-2">{nombreVisible(e, anonimo)}</td>
                  {e.puntos.map((p) => (
                    <td key={p.hito} className="px-2 py-1.5">
                      {num(p.pct)}
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 font-semibold ${e.delta !== null && e.delta > 2 ? 'text-[#006300]' : e.delta !== null && e.delta < -2 ? 'text-[#b42318]' : ''}`}>
                    {e.delta === null ? '—' : `${e.delta > 0 ? '+' : ''}${num(e.delta)}`}
                  </td>
                  <td className="px-2 py-1.5 text-xs">
                    {e.tendencia === 'mejora' ? '▲ mejora' : e.tendencia === 'retroceso' ? '▼ retroceso' : e.tendencia === 'estable' ? '■ estable' : '—'}
                    {e.cruzaUmbral && ' · cruza Logrado'}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-tinta-2">
                    {e.brechasRecuperadas.length} / {e.brechasNuevas.length}
                  </td>
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
