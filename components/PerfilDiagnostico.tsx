'use client';
import { BarraComparada, BarraErrores, CajasBigotes, LineasHitos, num } from './graficos';
import { RIESGO, NIVEL_COLOR, TINTA_SOBRE_NIVEL } from '@/lib/paleta';
import {
  ETIQUETA_ESTADO,
  TIPOS_ERROR,
  temaDe,
  type AnalisisHito,
  type ComparacionHitos,
  type PerfilDiagnostico as Perfil,
} from '@/lib/analisis-hitos';

export function InsigniaNivel({ etiqueta }: { etiqueta: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
      style={{ background: NIVEL_COLOR[etiqueta] ?? '#e3e4e8', color: TINTA_SOBRE_NIVEL[etiqueta] ?? '#14171c' }}
    >
      {etiqueta}
    </span>
  );
}

export function InsigniaRiesgo({ nivel }: { nivel: 'alto' | 'medio' | 'bajo' }) {
  const r = RIESGO[nivel];
  return (
    <span className="inline-flex items-center gap-1 rounded border border-borde bg-white px-2 py-0.5 text-xs font-medium text-tinta">
      <span style={{ color: r.color }} aria-hidden>
        {r.icono}
      </span>
      {r.etiqueta}
    </span>
  );
}

const ESTILO_ESTADO: Record<string, string> = {
  correcta: 'text-[#006300]',
  con_perdidas: 'text-tinta-2',
  no_lograda: 'text-[#b42318] font-semibold',
  sin_nota: 'text-tinta-3 italic',
};

const ESTILO_PRIORIDAD: Record<string, string> = {
  alta: 'bg-[#fde8e8] text-[#912018]',
  media: 'bg-[#fff4d6] text-[#7a5300]',
  baja: 'bg-[#e9f7ec] text-[#14532d]',
};

export function nombreVisible(p: Pick<Perfil, 'codigo' | 'nombre'>, anonimo: boolean) {
  return anonimo ? `Estudiante ${p.codigo}` : p.nombre;
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-borde bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="text-lg font-semibold text-tinta">{valor}</div>
      {nota && <div className="text-[11px] text-tinta-2">{nota}</div>}
    </div>
  );
}

export function PerfilDiagnosticoVista({
  analisis,
  perfil,
  anonimo,
  comparacion,
  impresion = false,
}: {
  analisis: AnalisisHito;
  perfil: Perfil;
  anonimo: boolean;
  comparacion?: ComparacionHitos | null;
  impresion?: boolean;
}) {
  const progreso = comparacion?.estudiantes.find((e) => e.clave === perfil.clave);
  const total = analisis.estudiantes.length;

  return (
    <article className="space-y-5">
      <header className="sin-cortar flex flex-col gap-3 border-b border-borde pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-tinta-3">Perfil diagnóstico · Hito {analisis.hito}</p>
          <h2 className="text-2xl font-bold text-tinta">{nombreVisible(perfil, anonimo)}</h2>
          {!anonimo && perfil.correo && <p className="text-sm text-tinta-2">{perfil.correo}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <InsigniaNivel etiqueta={perfil.nivel.etiqueta} />
            <InsigniaRiesgo nivel={perfil.riesgo.nivel} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato etiqueta="Dominio global" valor={`${num(perfil.pctGlobal)} %`} nota={perfil.nivel.etiqueta} />
          <Dato etiqueta="Posición" valor={`${perfil.posicion} / ${total}`} nota={`Percentil ${num(perfil.percentilGlobal, 0)}`} />
          <Dato etiqueta="Cuartil" valor={`Q${perfil.cuartilGlobal}`} nota={perfil.cuartilGlobal === 4 ? '25 % superior' : perfil.cuartilGlobal === 1 ? '25 % inferior' : 'zona media'} />
          <Dato
            etiqueta="P1 → P3"
            valor={perfil.progresoInterno === null ? '—' : `${perfil.progresoInterno > 0 ? '+' : ''}${num(perfil.progresoInterno)} pp`}
            nota="dentro del hito"
          />
        </div>
      </header>

      <p className="sin-cortar rounded-lg bg-acento-suave px-4 py-3 text-sm leading-relaxed text-tinta">{perfil.sintesis}</p>

      {perfil.riesgo.motivos.length > 0 && (
        <ul className="sin-cortar list-disc pl-5 text-sm text-tinta-2">
          {perfil.riesgo.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <section className="sin-cortar">
        <h3 className="mb-2 text-sm font-semibold text-tinta">Posición en cada asignatura frente a la cohorte</h3>
        <CajasBigotes
          filas={perfil.materias.map((m) => ({
            etiqueta: m.materia,
            est: analisis.materias.find((r) => r.materia === m.materia)!.estadisticos,
          }))}
          marca={perfil.materias.map((m) => m.pct)}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-tinta">Desglose por asignatura y pregunta</h3>
        {perfil.materias.map((m) => (
          <div key={m.materia} className="sin-cortar rounded-lg border border-borde bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-tinta">{m.materia}</span>
                <InsigniaNivel etiqueta={m.nivel.etiqueta} />
              </div>
              <div className="text-xs text-tinta-2">
                {num(m.pct)} % · curso {num(m.mediaCurso)} % ({m.diferencia >= 0 ? '+' : ''}
                {num(m.diferencia)}) · Q{m.cuartil} · percentil {num(m.percentil, 0)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-tinta-3">
                  <tr>
                    <th className="px-4 py-2 font-medium">Pregunta</th>
                    <th className="px-2 py-2 font-medium">Puntaje</th>
                    <th className="w-40 px-2 py-2 font-medium">Frente al curso</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                    <th className="px-2 py-2 font-medium">Tipo de error</th>
                  </tr>
                </thead>
                <tbody>
                  {m.preguntas.map((p) => (
                    <tr key={p.id} className="border-t border-borde align-top">
                      <td className="px-4 py-2">
                        <div className="font-medium text-tinta">
                          {p.corta} · {temaDe(p.etiqueta)}
                        </div>
                        {p.estado === 'no_lograda' && p.competencias.length > 0 && (
                          <div className="mt-0.5 text-xs text-tinta-2">No evidencia: {p.competencias.slice(0, 4).join('; ')}{p.competencias.length > 4 ? '…' : ''}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-tinta">
                        {p.valor === null ? '—' : `${num(p.valor, 0)} / ${p.max}`}
                        <div className="text-xs text-tinta-2">{num(p.pct)} %</div>
                      </td>
                      <td className="px-2 py-2">
                        <BarraComparada valor={p.pct} referencia={p.mediaCurso} />
                        <div className="text-[11px] text-tinta-3">curso {num(p.mediaCurso)} %</div>
                      </td>
                      <td className={`px-2 py-2 text-xs ${ESTILO_ESTADO[p.estado]}`}>{ETIQUETA_ESTADO[p.estado]}</td>
                      <td className="px-2 py-2 text-xs text-tinta">{p.tipoError ? TIPOS_ERROR[p.tipoError].etiqueta : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {m.preguntasNoLogradas.length > 0 && (
              <div className="border-t border-borde px-4 py-2 text-xs text-tinta-2">
                Preguntas no logradas: <b className="text-tinta">{m.preguntasNoLogradas.join(', ')}</b>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className={`grid gap-4 ${impresion ? '' : 'lg:grid-cols-2'}`}>
        <div className="sin-cortar rounded-lg border border-borde bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-tinta">Fortalezas demostradas</h3>
          {perfil.fortalezas.length ? (
            <ul className="space-y-1.5 text-sm text-tinta">
              {perfil.fortalezas.slice(0, 6).map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[#006300]" aria-hidden>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">Ninguna pregunta alcanza el nivel Destacado (≥ 71 %) en este hito.</p>
          )}
        </div>
        <div className="sin-cortar rounded-lg border border-borde bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-tinta">Debilidades específicas</h3>
          {perfil.debilidades.length ? (
            <ul className="space-y-1.5 text-sm text-tinta">
              {perfil.debilidades.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-[#b42318]" aria-hidden>✕</span>
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">No hay preguntas por debajo del nivel Logrado (51 %).</p>
          )}
        </div>
      </section>

      <section className="sin-cortar rounded-lg border border-borde bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-tinta">Recomendaciones de estudio</h3>
        {perfil.recomendaciones.length ? (
          <ol className="space-y-2 text-sm">
            {perfil.recomendaciones.slice(0, impresion ? 12 : 8).map((r) => (
              <li key={r.accion} className="flex gap-3">
                <span className={`h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${ESTILO_PRIORIDAD[r.prioridad]}`}>{r.prioridad}</span>
                <span>
                  <span className="text-tinta">{r.accion}</span>
                  <span className="block text-xs text-tinta-2">
                    {r.materia} · {r.pregunta} · {num(r.puntosEnRiesgo)} pts por recuperar
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-tinta-2">Sin acciones pendientes: sostener la práctica actual.</p>
        )}
      </section>

      <section className="sin-cortar rounded-lg border border-borde bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-tinta">Tipos de error en las preguntas no correctas</h3>
        <BarraErrores errores={perfil.erroresPorTipo} />
        <p className="mt-2 text-[11px] leading-relaxed text-tinta-3">
          El tipo de error se infiere de la banda de puntaje de cada pregunta (conceptual &lt; 31 %, procedimental 31–70 %, descuido 71–89 %), porque el libro registra el
          puntaje por pregunta y no la respuesta escrita. Es una guía para la revisión docente, no una observación directa.
        </p>
      </section>

      {(progreso || perfil.habilidadesBlandas !== null) && (
        <section className="sin-cortar rounded-lg border border-borde bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-tinta">Progresión entre hitos</h3>
          {perfil.habilidadesBlandas !== null && (
            <p className="mb-2 text-sm text-tinta-2">
              Habilidades blandas (consolidado institucional): <b className="text-tinta">{num(perfil.habilidadesBlandas)} %</b>
            </p>
          )}
          {progreso && comparacion ? (
            <>
              <LineasHitos
                hitos={comparacion.hitos}
                series={[{ etiqueta: 'Dominio global', puntos: progreso.puntos.map((p) => p.pct), resaltar: true }]}
              />
              <p className="text-sm text-tinta">
                Variación {comparacion.hitos[0]} → {comparacion.hitos[comparacion.hitos.length - 1]}:{' '}
                <b>{progreso.delta === null ? '—' : `${progreso.delta > 0 ? '+' : ''}${num(progreso.delta)} pp`}</b> ({progreso.tendencia ?? 'sin datos'})
                {progreso.cruzaUmbral && ' · cruza el umbral Logrado'}
              </p>
              {progreso.brechasRecuperadas.length > 0 && (
                <p className="mt-1 text-xs text-tinta-2">Brechas recuperadas: {progreso.brechasRecuperadas.join('; ')}</p>
              )}
              {progreso.brechasNuevas.length > 0 && <p className="mt-1 text-xs text-tinta-2">Brechas nuevas: {progreso.brechasNuevas.join('; ')}</p>}
            </>
          ) : (
            <p className="text-xs text-tinta-3">La comparación entre hitos aparece cuando se cargan los datos del Hito Intermedio o Final.</p>
          )}
        </section>
      )}
    </article>
  );
}
