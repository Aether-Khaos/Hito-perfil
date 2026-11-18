'use client';
import { Barra, BarraApilada, DonaPregunta, num } from './graficos';
import { ERROR_COLOR, NIVEL_COLOR, RIESGO, TINTA_SOBRE_NIVEL } from '@/lib/paleta';
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
      style={{ background: NIVEL_COLOR[etiqueta] ?? '#e9ecef', color: TINTA_SOBRE_NIVEL[etiqueta] ?? '#212529' }}
    >
      {etiqueta}
    </span>
  );
}

export function InsigniaRiesgo({ nivel }: { nivel: 'alto' | 'medio' | 'bajo' }) {
  const r = RIESGO[nivel];
  return <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${r.fondo}`}>{r.etiqueta}</span>;
}

/** Título de bloque al estilo de main: barra azul + mayúsculas pequeñas. */
export function TituloBloque({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-tinta">
      <span className="h-4 w-1.5 rounded bg-acento" />
      {children}
    </h3>
  );
}

const ESTADO_ESTILO: Record<string, string> = {
  correcta: 'bg-green-50 text-green-700 border-green-200',
  con_perdidas: 'bg-amber-50 text-amber-700 border-amber-200',
  no_lograda: 'bg-red-50 text-red-700 border-red-200',
  sin_nota: 'bg-gray-50 text-gray-500 border-gray-200',
};

const PRIORIDAD: Record<string, { texto: string; estilo: string }> = {
  alta: { texto: 'Primero', estilo: 'bg-red-100 text-red-800' },
  media: { texto: 'Después', estilo: 'bg-amber-100 text-amber-800' },
  baja: { texto: 'Repaso', estilo: 'bg-green-100 text-green-800' },
};

function grupoDe(cuartil: number) {
  return cuartil === 4 ? 'Entre el 25 % más alto' : cuartil === 3 ? 'Por encima de la mitad' : cuartil === 2 ? 'Por debajo de la mitad' : 'Entre el 25 % más bajo';
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="rounded border border-borde bg-white px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-tinta-3">{etiqueta}</div>
      <div className="text-xl font-bold text-tinta">{valor}</div>
      {nota && <div className="text-[11px] leading-tight text-tinta-2">{nota}</div>}
    </div>
  );
}

export function PerfilDiagnosticoVista({
  analisis,
  perfil,
  comparacion,
  impresion = false,
  anonimo = false,
}: {
  analisis: AnalisisHito;
  perfil: Perfil;
  comparacion?: ComparacionHitos | null;
  impresion?: boolean;
  anonimo?: boolean;
}) {
  const progreso = comparacion?.estudiantes.find((e) => e.clave === perfil.clave);
  const total = analisis.estudiantes.length;
  const superaA = Math.max(0, Math.round(((total - perfil.posicion) / Math.max(1, total - 1)) * 100));

  return (
    <article className="space-y-6">
      {/* Encabezado */}
      <header className="sin-cortar overflow-hidden rounded border border-borde bg-white">
        <div className="flex flex-col gap-3 border-b border-borde bg-[#f8f9fa] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tinta-3">Perfil del estudiante · Hito {analisis.hito}</p>
            <h2 className="truncate text-xl font-bold text-tinta sm:text-2xl">{anonimo ? `Estudiante ${perfil.codigo}` : perfil.nombre}</h2>
            {!anonimo && perfil.correo && <p className="truncate text-sm text-tinta-2">{perfil.correo}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <InsigniaNivel etiqueta={perfil.nivel.etiqueta} />
            <InsigniaRiesgo nivel={perfil.riesgo.nivel} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <Dato etiqueta="Promedio general" valor={`${num(perfil.pctGlobal, 0)} %`} nota={`Nivel ${perfil.nivel.etiqueta}`} />
          <Dato etiqueta="Puesto en el curso" valor={`${perfil.posicion} de ${total}`} nota={`Supera al ${superaA} % del curso`} />
          <Dato etiqueta="Ubicación" valor={`Grupo ${perfil.cuartilGlobal} de 4`} nota={grupoDe(perfil.cuartilGlobal)} />
          <Dato
            etiqueta="De la 1.ª a la 3.ª evaluación"
            valor={perfil.progresoInterno === null ? '—' : `${Math.round(perfil.progresoInterno) > 0 ? '+' : ''}${Math.round(perfil.progresoInterno)} pts`}
            nota={perfil.progresoInterno === null ? 'Sin datos' : perfil.progresoInterno > 2 ? 'Mejoró' : perfil.progresoInterno < -2 ? 'Bajó' : 'Se mantuvo'}
          />
        </div>
      </header>

      {/* Resumen en palabras */}
      <div className="sin-cortar space-y-2 rounded border border-blue-200 bg-blue-50 p-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-acento">En pocas palabras</h4>
        <p className="text-sm leading-relaxed text-tinta">{perfil.sintesis}</p>
        {perfil.riesgo.motivos.length > 0 && (
          <ul className="list-inside list-disc text-sm text-tinta-2">
            {perfil.riesgo.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Asignaturas */}
      <section className="space-y-4">
        <TituloBloque>Resultado por asignatura y pregunta</TituloBloque>
        {perfil.materias.map((m) => (
          <div key={m.materia} className="sin-cortar overflow-hidden rounded border border-borde bg-white">
            <div className="flex flex-col gap-2 border-b border-borde bg-[#f8f9fa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-tinta">{m.materia}</span>
                <InsigniaNivel etiqueta={m.nivel.etiqueta} />
              </div>
              <div className="text-xs text-tinta-2">
                Obtuvo <b className="text-tinta">{num(m.pct, 0)} %</b> · promedio del curso {num(m.mediaCurso, 0)} % ·{' '}
                <b className={m.diferencia >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {m.diferencia >= 0 ? '+' : ''}
                  {num(m.diferencia, 0)} pts
                </b>
              </div>
            </div>
            <div className="px-4 pt-3">
              <Barra valor={m.pct} referencia={m.mediaCurso} color={NIVEL_COLOR[m.nivel.etiqueta]} />
              <p className="mt-1 text-[11px] text-tinta-3">La raya negra es el promedio del curso; la línea punteada, el nivel esperado (51 %).</p>
            </div>
            <div className={`grid gap-3 p-4 ${m.preguntas.length === 1 ? 'grid-cols-1 sm:max-w-sm' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {m.preguntas.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 rounded border border-borde bg-[#f8f9fa] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-acento">{p.corta}</span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${ESTADO_ESTILO[p.estado]}`}>{ETIQUETA_ESTADO[p.estado]}</span>
                  </div>
                  <div className="flex flex-row items-center gap-4 sm:flex-col sm:gap-3">
                    <div className="shrink-0">
                      <DonaPregunta valor={p.pct} curso={p.mediaCurso} tamano={112} />
                    </div>
                    <div className="min-w-0 space-y-1 sm:text-center">
                      <span className="block text-[10px] font-bold uppercase text-tinta-3">Tema evaluado</span>
                      <p className="text-xs font-semibold text-tinta">{temaDe(p.etiqueta)}</p>
                      <p className="text-[11px] text-tinta-2">
                        {p.valor === null ? 'Sin nota' : `${num(p.valor, 0)} de ${p.max} puntos`} · curso {num(p.mediaCurso, 0)} %
                      </p>
                    </div>
                  </div>
                  {p.tipoError && (
                    <p className="text-[11px] leading-snug text-tinta-2">
                      <b style={{ color: ERROR_COLOR[p.tipoError] }}>Error {TIPOS_ERROR[p.tipoError].etiqueta.toLowerCase()}:</b> {TIPOS_ERROR[p.tipoError].descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Fortalezas y debilidades, como en main */}
      <section className={`grid gap-4 ${impresion ? '' : 'md:grid-cols-2'}`}>
        <div className="sin-cortar space-y-2 rounded border border-green-200 bg-green-50 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-green-800">Lo que domina</h4>
          {perfil.fortalezas.length ? (
            <ul className="list-inside list-disc space-y-1.5 text-sm text-tinta">
              {perfil.fortalezas.slice(0, 6).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">Todavía ninguna pregunta llega al 71 %.</p>
          )}
        </div>
        <div className="sin-cortar space-y-2 rounded border border-amber-200 bg-amber-50 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">Lo que le cuesta</h4>
          {perfil.debilidades.length ? (
            <ul className="list-inside list-disc space-y-1.5 text-sm text-tinta">
              {perfil.debilidades.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">No tiene preguntas por debajo del 51 %.</p>
          )}
        </div>
      </section>

      <section className="sin-cortar space-y-3 rounded border border-red-200 bg-red-50 p-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-red-800">Qué debe estudiar</h4>
        {perfil.recomendaciones.length ? (
          <ol className="space-y-2.5 text-sm">
            {perfil.recomendaciones.slice(0, impresion ? 10 : 7).map((r) => (
              <li key={r.accion} className="flex gap-3">
                <span className={`h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${PRIORIDAD[r.prioridad].estilo}`}>{PRIORIDAD[r.prioridad].texto}</span>
                <span>
                  <span className="text-tinta">{r.accion}</span>
                  <span className="block text-xs text-tinta-2">
                    {r.materia} · {r.pregunta}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-tinta-2">Sin pendientes: mantener el ritmo de estudio.</p>
        )}
      </section>

      <section className="sin-cortar space-y-3 rounded border border-borde bg-white p-5">
        <TituloBloque>¿Por qué se equivocó?</TituloBloque>
        <BarraApilada
          segmentos={(['conceptual', 'procedimental', 'descuido'] as const).map((t) => ({
            etiqueta: TIPOS_ERROR[t].etiqueta,
            valor: perfil.erroresPorTipo[t],
            color: ERROR_COLOR[t],
          }))}
        />
        <p className="text-[11px] leading-relaxed text-tinta-3">
          Se estima a partir del puntaje de cada pregunta, no de la respuesta escrita. Sirve como guía para conversar con el docente.
        </p>
      </section>

      {(progreso || perfil.habilidadesBlandas !== null) && (
        <section className="sin-cortar space-y-3 rounded border border-borde bg-white p-5">
          <TituloBloque>Avance entre hitos</TituloBloque>
          {perfil.habilidadesBlandas !== null && (
            <p className="text-sm text-tinta-2">
              Habilidades blandas: <b className="text-tinta">{num(perfil.habilidadesBlandas, 0)} %</b>
            </p>
          )}
          {progreso && comparacion ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {progreso.puntos.map((pt) => (
                  <div key={pt.hito} className="rounded border border-borde bg-[#f8f9fa] p-3 text-center">
                    <div className="text-[10px] font-bold uppercase text-tinta-3">{pt.hito}</div>
                    <div className="text-lg font-bold text-tinta">{num(pt.pct, 0)} %</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-tinta">
                Cambio total:{' '}
                <b className={(progreso.delta ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {progreso.delta === null ? '—' : `${progreso.delta > 0 ? '+' : ''}${num(progreso.delta, 0)} pts`}
                </b>
                {progreso.cruzaUmbral && ' · alcanzó el nivel esperado'}
              </p>
              {progreso.brechasRecuperadas.length > 0 && <p className="text-xs text-tinta-2">Ya superó: {progreso.brechasRecuperadas.join('; ')}</p>}
            </>
          ) : (
            <p className="text-xs text-tinta-3">Aparecerá cuando se carguen los datos del Hito Intermedio o Final.</p>
          )}
        </section>
      )}
    </article>
  );
}
