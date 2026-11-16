'use client';

interface Nivel {
  id: string;
  etiqueta: string;
  min: number;
  max: number;
}

interface ReactivoDiagnosticado {
  id: string;
  nombre: string;
  dimension: string;
  puntos: number;
  valor: number | null;
  pct: number | null;
  estado: 'logrado' | 'parcial' | 'no_logrado' | 'sin_evidencia' | 'no_atribuible';
  fuente: 'reactivo' | 'dimension';
  carencia: string;
  accion: string;
}

interface DimensionDiagnosticada {
  id: string;
  etiqueta: string;
  consigna: string;
  max: number;
  valor: number | null;
  pct: number | null;
  nivel: Nivel | null;
  evaluada: boolean;
  reactivos: ReactivoDiagnosticado[];
}

export interface Brecha {
  tipo: 'dimension' | 'reactivo';
  id: string;
  nombre: string;
  materia: string;
  dimension: string;
  dimensionEtiqueta: string;
  puntosEnRiesgo: number;
  dominioPct: number | null;
  nivel: Nivel;
  descripcion: string;
  recomendacion: string;
  competencias: string[];
}

export interface MateriaDiagnosticada {
  materia: string;
  catalogada: boolean;
  instrumento: string | null;
  pctGlobal: number;
  nivelGlobal: Nivel;
  cobertura: 'reactivo' | 'dimension';
  dimensiones: DimensionDiagnosticada[];
  brechas: Brecha[];
  fortalezas: string[];
  advertencias: string[];
  promedio: {
    puntos: number;
    maximoDisponible: number;
    maximoTotal: number;
    pct: number;
    pctSobreTotal: number;
    evaluacionesConsideradas: string[];
    evaluacionesAusentes: string[];
    completo: boolean;
  };
}

export interface EstudianteDiagnosticado {
  nombre: string;
  correo?: string;
  pctGlobal: number;
  nivelGlobal: Nivel;
  materias: MateriaDiagnosticada[];
  brechas: Brecha[];
  fortalezas: string[];
  narrativa: string;
}

const BADGE_NIVEL: Record<string, string> = {
  Inicio: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  Proceso: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Logrado: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  Destacado: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Excepcional: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
};

const BARRA_NIVEL: Record<string, string> = {
  Inicio: 'bg-rose-500',
  Proceso: 'bg-amber-500',
  Logrado: 'bg-sky-500',
  Destacado: 'bg-emerald-500',
  Excepcional: 'bg-violet-500',
};

const ETIQUETA_ESTADO: Record<string, string> = {
  logrado: 'logrado',
  parcial: 'parcial',
  no_logrado: 'no logrado',
  sin_evidencia: 'sin evidencia',
  no_atribuible: 'sin nota por ítem',
};

const PUNTO_ESTADO: Record<string, string> = {
  logrado: 'bg-emerald-400',
  parcial: 'bg-amber-400',
  no_logrado: 'bg-rose-500',
  sin_evidencia: 'bg-slate-500',
  no_atribuible: 'bg-slate-600',
};

function fmt(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return valor.toFixed(decimales).replace('.', ',');
}

export function EtiquetaNivel({ nivel }: { nivel: Nivel | null }) {
  if (!nivel) return <span className="text-[11px] text-slate-500">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        BADGE_NIVEL[nivel.etiqueta] ?? 'border-slate-700 bg-slate-800 text-slate-300'
      }`}
    >
      {nivel.etiqueta}
    </span>
  );
}

export function BarraDominio({ pct, nivel }: { pct: number | null; nivel: Nivel | null }) {
  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${pct === null ? 'bg-slate-700' : BARRA_NIVEL[nivel?.etiqueta ?? 'Inicio']}`}
          style={{ width: `${Math.min(Math.max(pct ?? 0, 0), 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{pct === null ? 'sin nota registrada' : `${fmt(pct)} % de dominio`}</span>
        <span>{nivel?.etiqueta ?? '—'}</span>
      </div>
    </div>
  );
}

export function Panel({
  children,
  tono = 'neutro',
  className = '',
}: {
  children: React.ReactNode;
  tono?: 'neutro' | 'riesgo' | 'logro';
  className?: string;
}) {
  const estilos =
    tono === 'riesgo'
      ? 'border-rose-500/30 bg-rose-500/5'
      : tono === 'logro'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-slate-800/90 bg-slate-900/55';
  return <div className={`rounded-xl border p-5 backdrop-blur-md ${estilos} ${className}`}>{children}</div>;
}

function Reactivo({ reactivo }: { reactivo: ReactivoDiagnosticado }) {
  const esBrecha = reactivo.estado === 'no_logrado' || reactivo.estado === 'parcial';
  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PUNTO_ESTADO[reactivo.estado]}`} aria-hidden="true" />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-xs font-medium text-slate-200">{reactivo.nombre}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {reactivo.puntos} pts · {ETIQUETA_ESTADO[reactivo.estado]}
          </span>
        </div>
        {esBrecha && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{reactivo.carencia}</p>}
      </div>
    </li>
  );
}

function TarjetaMateria({ materia }: { materia: MateriaDiagnosticada }) {
  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-900/45">
      <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{materia.materia}</h4>
          <p className="text-[10px] text-slate-500">{materia.instrumento ?? 'Asignatura sin instrumento catalogado'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-sky-400">{fmt(materia.pctGlobal)} %</span>
          <EtiquetaNivel nivel={materia.nivelGlobal} />
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {materia.advertencias.map((aviso, indice) => (
          <p key={indice} className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            {aviso}
          </p>
        ))}

        {materia.dimensiones.map((dimension) => (
          <div key={dimension.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">{dimension.etiqueta}</span>
              <span className="text-[10px] text-slate-500">
                {dimension.valor === null ? 'sin nota' : `${fmt(dimension.valor)} / ${dimension.max} pts`}
              </span>
            </div>
            <BarraDominio pct={dimension.pct} nivel={dimension.nivel} />
            <ul className="mt-1 divide-y divide-slate-800/70">
              {dimension.reactivos.map((reactivo) => (
                <Reactivo key={reactivo.id} reactivo={reactivo} />
              ))}
            </ul>
          </div>
        ))}

        {materia.promedio.evaluacionesAusentes.length > 0 && (
          <p className="text-[11px] text-slate-500">
            Evaluaciones sin nota: {materia.promedio.evaluacionesAusentes.join(', ')}. El porcentaje se calcula sobre
            los {fmt(materia.promedio.maximoDisponible, 0)} puntos disponibles, no sobre 100.
          </p>
        )}
      </div>
    </div>
  );
}

export function PerfilCompetencias({ estudiante }: { estudiante: EstudianteDiagnosticado }) {
  return (
    <div className="space-y-4">
      <Panel className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 text-lg font-bold text-sky-300">
              {estudiante.nombre.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Perfil de competencias
              </span>
              <h3 className="text-lg font-bold text-slate-100">{estudiante.nombre}</h3>
              {estudiante.correo && <p className="text-[11px] text-slate-500">{estudiante.correo}</p>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-bold text-sky-400">{fmt(estudiante.pctGlobal)} %</div>
            <EtiquetaNivel nivel={estudiante.nivelGlobal} />
          </div>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-slate-300">{estudiante.narrativa}</p>
      </Panel>

      {estudiante.brechas.length > 0 && (
        <Panel tono="riesgo">
          <h4 className="text-xs font-bold uppercase tracking-wide text-rose-300">
            Carencias prioritarias ({estudiante.brechas.length})
          </h4>
          <ul className="mt-2 space-y-2">
            {estudiante.brechas.slice(0, 6).map((brecha) => (
              <li
                key={`${brecha.materia}-${brecha.id}`}
                className="rounded-lg border border-rose-500/20 bg-slate-900/60 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-slate-100">{brecha.nombre}</span>
                  <span className="text-[10px] font-semibold uppercase text-rose-300">
                    {brecha.materia} · {fmt(brecha.puntosEnRiesgo)} pts en riesgo
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{brecha.descripcion}</p>
                <p className="mt-1 text-[11px] leading-snug text-sky-300">→ {brecha.recomendacion}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {estudiante.fortalezas.length > 0 && (
        <Panel tono="logro">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-300">Fortalezas verificadas</h4>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
            {estudiante.fortalezas.map((fortaleza, indice) => (
              <li key={indice}>{fortaleza}</li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="space-y-4">
        {estudiante.materias
          .filter((materia) => materia.catalogada)
          .map((materia) => (
            <TarjetaMateria key={materia.materia} materia={materia} />
          ))}
      </div>

      {estudiante.materias.some((materia) => !materia.catalogada) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[11px] text-slate-400">
          <strong className="text-slate-300">Asignaturas sin banco de reactivos:</strong>{' '}
          {estudiante.materias
            .filter((materia) => !materia.catalogada)
            .map((materia) => materia.materia)
            .join(', ')}
          . Se muestran sus porcentajes, pero no se interpretan por competencias.
        </div>
      )}
    </div>
  );
}
