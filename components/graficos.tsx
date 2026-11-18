'use client';
/**
 * Gráficos sencillos y adaptables (se ven bien en celular y en proyector).
 * Donas al estilo de la rama main y barras en HTML que crecen con el contenedor.
 * Cada color va acompañado de su texto.
 */
import { AZUL, GRIS, GRIS_CLARO, NIVEL_COLOR } from '@/lib/paleta';

export const num = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ',');

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

/* ---------------- Dona (igual que en main) ---------------- */

export function Dona({
  segmentos,
  tamano = 160,
  grosor = 24,
  centroValor,
  centroEtiqueta,
  leyenda = true,
  sufijo = '',
}: {
  segmentos: Segmento[];
  tamano?: number;
  grosor?: number;
  centroValor?: string;
  centroEtiqueta?: string;
  leyenda?: boolean;
  sufijo?: string;
}) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const radio = (tamano - grosor) / 2;
  const circ = 2 * Math.PI * radio;
  let acumulado = 0;
  return (
    <div className={`flex items-center gap-5 ${leyenda ? 'flex-col sm:flex-row' : 'flex-col'}`}>
      <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
        <svg width={tamano} height={tamano} className="-rotate-90" role="img" aria-label={segmentos.map((s) => `${s.etiqueta}: ${s.valor}`).join(', ')}>
          <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" stroke={GRIS_CLARO} strokeWidth={grosor} />
          {total > 0 &&
            segmentos.map((s) => {
              const f = s.valor / total;
              const dash = Math.max(0, f * circ - 1.5);
              const offset = -acumulado * circ;
              acumulado += f;
              if (s.valor <= 0) return null;
              return (
                <circle
                  key={s.etiqueta}
                  cx={tamano / 2}
                  cy={tamano / 2}
                  r={radio}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={grosor}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={offset}
                >
                  <title>{`${s.etiqueta}: ${s.valor}${sufijo}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centroValor && <span className="text-2xl font-bold leading-none text-tinta">{centroValor}</span>}
          {centroEtiqueta && <span className="mt-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-tinta-3">{centroEtiqueta}</span>}
        </div>
      </div>
      {leyenda && (
        <ul className="w-full flex-1 space-y-1.5">
          {segmentos.map((s) => (
            <li key={s.etiqueta} className="flex items-center gap-2.5 text-sm">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1 truncate text-tinta">{s.etiqueta}</span>
              <span className="font-semibold tabular-nums text-tinta">
                {s.valor}
                {sufijo}
              </span>
              {!sufijo && total > 0 && <span className="w-10 text-right text-xs tabular-nums text-tinta-3">{Math.round((s.valor / total) * 100)}%</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Dona de una pregunta: lo que obtuvo el estudiante frente al promedio del curso (como en main). */
export function DonaPregunta({ valor, curso, tamano = 132 }: { valor: number | null; curso: number | null; tamano?: number }) {
  const v = valor ?? 0;
  const c = curso ?? 0;
  return (
    <Dona
      leyenda={false}
      tamano={tamano}
      grosor={18}
      centroValor={valor === null ? '—' : `${num(v, 0)}%`}
      centroEtiqueta="obtuvo"
      segmentos={[
        { etiqueta: 'Obtuvo', valor: v, color: AZUL },
        { etiqueta: 'Le faltó para el promedio del curso', valor: Math.max(c - v, 0), color: GRIS },
        { etiqueta: 'Resto', valor: Math.max(100 - Math.max(v, c), 0), color: GRIS_CLARO },
      ]}
    />
  );
}

/** Dona con la distribución de estudiantes por nivel. */
export function DonaNiveles({ conteos, tamano = 150 }: { conteos: Record<string, number>; tamano?: number }) {
  const total = Object.values(conteos).reduce((s, x) => s + x, 0);
  return (
    <Dona
      tamano={tamano}
      centroValor={String(total)}
      centroEtiqueta="estudiantes"
      segmentos={Object.entries(NIVEL_COLOR).map(([nivel, color]) => ({ etiqueta: nivel, valor: conteos[nivel] ?? 0, color }))}
    />
  );
}

/* ---------------- Barras en HTML ---------------- */

/** Barra horizontal 0–100 % con la línea del nivel esperado (51 %). */
export function Barra({
  valor,
  color = AZUL,
  referencia,
  alto = 10,
  meta = 51,
}: {
  valor: number | null;
  color?: string;
  referencia?: number | null;
  alto?: number;
  meta?: number | null;
}) {
  const v = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <div className="relative w-full rounded-full bg-[#e9ecef]" style={{ height: alto }}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color, minWidth: valor ? 3 : 0 }} />
      {meta !== null && (
        <div className="absolute -top-1 -bottom-1 w-px border-l border-dashed border-tinta-3" style={{ left: `${meta}%` }} title={`Nivel esperado: ${meta} %`} />
      )}
      {referencia !== undefined && referencia !== null && (
        <div
          className="absolute -top-1.5 -bottom-1.5 w-[3px] rounded bg-tinta"
          style={{ left: `calc(${Math.min(100, referencia)}% - 1px)` }}
          title={`Promedio del curso: ${num(referencia)} %`}
        />
      )}
    </div>
  );
}

/** Lista de barras con etiqueta y valor: se adapta a cualquier ancho. */
export function ListaBarras({
  items,
  color = AZUL,
  meta = 51,
}: {
  items: Array<{ etiqueta: string; valor: number; nota?: string; color?: string }>;
  color?: string;
  meta?: number | null;
}) {
  return (
    <ul className="space-y-3.5">
      {items.map((it) => (
        <li key={it.etiqueta}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-tinta">{it.etiqueta}</span>
            <span className="shrink-0 font-semibold tabular-nums text-tinta">{num(it.valor)} %</span>
          </div>
          <Barra valor={it.valor} color={it.color ?? color} meta={meta} />
          {it.nota && <p className="mt-1 text-xs text-tinta-3">{it.nota}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Barra apilada 100 % (por ejemplo, tipos de error). */
export function BarraApilada({ segmentos }: { segmentos: Segmento[] }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  return (
    <div>
      <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md bg-[#e9ecef]">
        {segmentos
          .filter((s) => s.valor > 0)
          .map((s) => (
            <div
              key={s.etiqueta}
              className="flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ width: `${(s.valor / total) * 100}%`, background: s.color }}
              title={`${s.etiqueta}: ${s.valor}`}
            >
              {s.valor / total > 0.12 ? `${Math.round((s.valor / total) * 100)}%` : ''}
            </div>
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
        {segmentos.map((s) => (
          <span key={s.etiqueta} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.etiqueta} ({s.valor})
          </span>
        ))}
      </div>
    </div>
  );
}
