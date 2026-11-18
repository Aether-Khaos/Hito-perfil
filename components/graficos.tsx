'use client';
/**
 * Gráficos SVG sin dependencias externas (tema claro).
 * Reglas: marcas finas con extremos redondeados de 4 px, separación de 2 px
 * entre segmentos, rejilla tenue, etiquetas directas selectivas y tooltip en
 * cada marca. El texto nunca usa el color de la serie.
 */
import { useState, type ReactNode, type MouseEvent } from 'react';
import { NIVEL_COLOR, TINTA_SOBRE_NIVEL, ERROR_COLOR, HITO_COLOR } from '@/lib/paleta';
import type { Estadisticos, TipoError, HitoId } from '@/lib/analisis-hitos';

const TINTA_2 = '#52514e';
const TINTA_3 = '#898781';
const REJILLA = '#e1e0d9';
const EJE = '#c3c2b7';

export const num = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ',');

/* ---------------- Tooltip ---------------- */

export function useTooltip() {
  const [estado, setEstado] = useState<{ x: number; y: number; contenido: ReactNode } | null>(null);
  const mostrar = (e: MouseEvent, contenido: ReactNode) => {
    const caja = (e.currentTarget as Element).closest('[data-grafico]')?.getBoundingClientRect();
    setEstado({ x: e.clientX - (caja?.left ?? 0), y: e.clientY - (caja?.top ?? 0), contenido });
  };
  const ocultar = () => setEstado(null);
  const nodo = estado ? (
    <div
      className="pointer-events-none absolute z-20 max-w-[260px] -translate-x-1/2 -translate-y-full rounded-md border border-borde bg-white px-3 py-2 text-xs text-tinta shadow-lg"
      style={{ left: estado.x, top: estado.y - 10 }}
    >
      {estado.contenido}
    </div>
  ) : null;
  return { mostrar, ocultar, nodo };
}

function Marco({ children, alto }: { children: ReactNode; alto?: number }) {
  return (
    <div data-grafico className="relative w-full max-w-[780px]" style={alto ? { minHeight: alto } : undefined}>
      {children}
    </div>
  );
}

const ESCALA = [0, 25, 50, 75, 100];

/* ---------------- Barras horizontales de dominio (0–100 %) ---------------- */

export interface ItemBarra {
  etiqueta: string;
  valor: number;
  detalle?: string;
  color?: string;
}

export function BarrasDominio({
  items,
  umbral = 51,
  etiquetaUmbral = 'Logrado (51 %)',
  anchoEtiqueta = 210,
  color = '#2a78d6',
}: {
  items: ItemBarra[];
  umbral?: number;
  etiquetaUmbral?: string;
  anchoEtiqueta?: number;
  color?: string;
}) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const fila = 30;
  const ancho = 640;
  const plot = ancho - anchoEtiqueta - 48;
  const alto = items.length * fila + 26;
  const x = (v: number) => anchoEtiqueta + (Math.max(0, Math.min(100, v)) / 100) * plot;
  return (
    <Marco>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-auto" role="img">
        {ESCALA.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={4} y2={alto - 20} stroke={REJILLA} strokeWidth={1} />
            <text x={x(t)} y={alto - 6} fontSize={10} fill={TINTA_3} textAnchor="middle">
              {t} %
            </text>
          </g>
        ))}
        <line x1={x(umbral)} x2={x(umbral)} y1={0} y2={alto - 20} stroke={TINTA_2} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={x(umbral) + 4} y={10} fontSize={10} fill={TINTA_2}>
          {etiquetaUmbral}
        </text>
        {items.map((it, i) => {
          const y = 14 + i * fila;
          const w = Math.max(2, x(it.valor) - anchoEtiqueta);
          return (
            <g
              key={it.etiqueta}
              onMouseMove={(e) =>
                mostrar(
                  e,
                  <>
                    <b>{it.etiqueta}</b>
                    <div>{num(it.valor)} %</div>
                    {it.detalle && <div className="text-tinta-2">{it.detalle}</div>}
                  </>,
                )
              }
              onMouseLeave={ocultar}
            >
              <rect x={0} y={y - 4} width={ancho} height={fila - 4} fill="transparent" />
              <text x={anchoEtiqueta - 8} y={y + 11} fontSize={12} fill="#14171c" textAnchor="end">
                {recortar(it.etiqueta, Math.floor(anchoEtiqueta / 6.6))}
              </text>
              <path d={barraRedondeada(anchoEtiqueta, y + 2, w, 14)} fill={it.color ?? color} />
              <text x={anchoEtiqueta + w + 6} y={y + 13} fontSize={11} fill={TINTA_2} stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
                {num(it.valor)} %
              </text>
            </g>
          );
        })}
      </svg>
      {nodo}
    </Marco>
  );
}

function recortar(texto: string, max: number) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/** Barra con el extremo de datos redondeado (4 px) y anclada a la línea base. */
function barraRedondeada(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h / 2);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}

/* ---------------- Distribución por niveles (100 % apilado) ---------------- */

const NIVELES = ['Inicio', 'Proceso', 'Logrado', 'Destacado', 'Excepcional'];

export function DistribucionNiveles({
  filas,
  anchoEtiqueta = 210,
}: {
  filas: Array<{ etiqueta: string; conteos: Record<string, number> }>;
  anchoEtiqueta?: number;
}) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const fila = 30;
  const ancho = 640;
  const plot = ancho - anchoEtiqueta - 10;
  const alto = filas.length * fila + 6;
  return (
    <Marco>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-auto" role="img">
        {filas.map((f, i) => {
          const total = NIVELES.reduce((s, n) => s + (f.conteos[n] ?? 0), 0) || 1;
          let acumulado = 0;
          const y = 4 + i * fila;
          return (
            <g key={f.etiqueta}>
              <text x={anchoEtiqueta - 8} y={y + 15} fontSize={12} fill="#14171c" textAnchor="end">
                {f.etiqueta.length > 34 ? `${f.etiqueta.slice(0, 33)}…` : f.etiqueta}
              </text>
              {NIVELES.map((n) => {
                const c = f.conteos[n] ?? 0;
                if (c === 0) return null;
                const w = (c / total) * plot;
                const x0 = anchoEtiqueta + (acumulado / total) * plot;
                acumulado += c;
                return (
                  <g
                    key={n}
                    onMouseMove={(e) =>
                      mostrar(
                        e,
                        <>
                          <b>{f.etiqueta}</b>
                          <div>
                            {n}: {c} estudiante(s) · {num((c / total) * 100)} %
                          </div>
                        </>,
                      )
                    }
                    onMouseLeave={ocultar}
                  >
                    <rect x={x0 + 1} y={y + 2} width={Math.max(0, w - 2)} height={20} rx={3} fill={NIVEL_COLOR[n]} />
                    {w > 22 && (
                      <text x={x0 + w / 2} y={y + 16} fontSize={11} textAnchor="middle" fill={TINTA_SOBRE_NIVEL[n]}>
                        {c}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <Leyenda items={NIVELES.map((n) => ({ etiqueta: n, color: NIVEL_COLOR[n] }))} />
      {nodo}
    </Marco>
  );
}

export function Leyenda({ items }: { items: Array<{ etiqueta: string; color: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
      {items.map((it) => (
        <span key={it.etiqueta} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.etiqueta}
        </span>
      ))}
    </div>
  );
}

/* ---------------- Diagrama de caja ---------------- */

export function CajasBigotes({
  filas,
  anchoEtiqueta = 210,
  marca,
}: {
  filas: Array<{ etiqueta: string; est: Estadisticos }>;
  anchoEtiqueta?: number;
  /** Valor individual a resaltar en cada fila (p. ej. el estudiante seleccionado). */
  marca?: Array<number | null>;
}) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const fila = 34;
  const ancho = 640;
  const plot = ancho - anchoEtiqueta - 20;
  const alto = filas.length * fila + 26;
  const x = (v: number) => anchoEtiqueta + (Math.max(0, Math.min(100, v)) / 100) * plot;
  return (
    <Marco>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-auto" role="img">
        {ESCALA.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={2} y2={alto - 20} stroke={REJILLA} />
            <text x={x(t)} y={alto - 6} fontSize={10} fill={TINTA_3} textAnchor="middle">
              {t} %
            </text>
          </g>
        ))}
        <line x1={x(51)} x2={x(51)} y1={2} y2={alto - 20} stroke={TINTA_2} strokeDasharray="4 3" />
        {filas.map((f, i) => {
          const y = 8 + i * fila + 10;
          const e = f.est;
          const m = marca?.[i];
          return (
            <g
              key={f.etiqueta}
              onMouseMove={(ev) =>
                mostrar(
                  ev,
                  <>
                    <b>{f.etiqueta}</b>
                    <div>
                      Mín {num(e.min)} · Q1 {num(e.q1)} · Mediana {num(e.mediana)} · Q3 {num(e.q3)} · Máx {num(e.max)}
                    </div>
                    <div>
                      Media {num(e.media)} % · DE {num(e.de)} · n = {e.n}
                    </div>
                    {m !== undefined && m !== null && <div className="font-semibold">Estudiante: {num(m)} %</div>}
                  </>,
                )
              }
              onMouseLeave={ocultar}
            >
              <rect x={0} y={y - 12} width={ancho} height={fila - 4} fill="transparent" />
              <text x={anchoEtiqueta - 8} y={y + 4} fontSize={12} fill="#14171c" textAnchor="end">
                {f.etiqueta.length > 34 ? `${f.etiqueta.slice(0, 33)}…` : f.etiqueta}
              </text>
              <line x1={x(e.min)} x2={x(e.max)} y1={y} y2={y} stroke={EJE} strokeWidth={2} />
              <rect x={x(e.q1)} y={y - 8} width={Math.max(2, x(e.q3) - x(e.q1))} height={16} rx={3} fill="#cde2fb" stroke="#2a78d6" strokeWidth={1} />
              <line x1={x(e.mediana)} x2={x(e.mediana)} y1={y - 8} y2={y + 8} stroke="#0d366b" strokeWidth={2} />
              <circle cx={x(e.media)} cy={y} r={3} fill="#ffffff" stroke="#0d366b" strokeWidth={1.5} />
              {m !== undefined && m !== null && (
                <path d={`M${x(m)},${y - 11} l5,-7 h-10 z`} fill="#eb6834" stroke="#ffffff" strokeWidth={1} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-tinta-2">
        <span>Caja: Q1–Q3 · línea: mediana · círculo: media · guiones: umbral Logrado</span>
        {marca && (
          <span className="inline-flex items-center gap-1">
            <span style={{ color: '#eb6834' }}>▼</span> estudiante seleccionado
          </span>
        )}
      </div>
      {nodo}
    </Marco>
  );
}

/* ---------------- Tipos de error (apilado) ---------------- */

export function BarraErrores({ errores }: { errores: Record<TipoError, number> }) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const tipos: Array<{ id: TipoError; etiqueta: string }> = [
    { id: 'conceptual', etiqueta: 'Conceptual' },
    { id: 'procedimental', etiqueta: 'Procedimental' },
    { id: 'descuido', etiqueta: 'Descuido' },
  ];
  const total = tipos.reduce((s, t) => s + errores[t.id], 0);
  let acumulado = 0;
  return (
    <Marco>
      <svg viewBox="0 0 640 34" className="w-full h-auto" role="img">
        {total === 0 && <rect x={0} y={6} width={640} height={22} rx={4} fill={REJILLA} />}
        {tipos.map((t) => {
          const c = errores[t.id];
          if (!c) return null;
          const w = (c / total) * 640;
          const x0 = (acumulado / total) * 640;
          acumulado += c;
          return (
            <g key={t.id} onMouseMove={(e) => mostrar(e, <><b>{t.etiqueta}</b><div>{c} pregunta(s) · {num((c / total) * 100)} %</div></>)} onMouseLeave={ocultar}>
              <rect x={x0 + 1} y={6} width={Math.max(0, w - 2)} height={22} rx={4} fill={ERROR_COLOR[t.id]} />
              {w > 120 && (
                <text x={x0 + w / 2} y={21} fontSize={11} textAnchor="middle" fill="#ffffff">
                  {t.etiqueta} {num((c / total) * 100, 0)} %
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Leyenda items={tipos.map((t) => ({ etiqueta: `${t.etiqueta} (${errores[t.id]})`, color: ERROR_COLOR[t.id] }))} />
      {nodo}
    </Marco>
  );
}

/* ---------------- Pregunta: estudiante frente al curso ---------------- */

export function BarraComparada({ valor, referencia }: { valor: number | null; referencia: number | null }) {
  const v = valor ?? 0;
  return (
    <svg viewBox="0 0 200 14" className="h-3.5 w-full" role="img" aria-label={`${num(valor)} % frente a ${num(referencia)} % del curso`}>
      <rect x={0} y={3} width={200} height={8} rx={4} fill="#eef0f3" />
      {valor !== null && <path d={barraRedondeada(0, 3, Math.max(2, (v / 100) * 200), 8)} fill="#2a78d6" />}
      {referencia !== null && <line x1={(referencia / 100) * 200} x2={(referencia / 100) * 200} y1={0} y2={14} stroke="#14171c" strokeWidth={2} />}
      <line x1={102} x2={102} y1={0} y2={14} stroke={TINTA_3} strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  );
}

/* ---------------- Evolución entre hitos (pendiente) ---------------- */

export function LineasHitos({
  hitos,
  series,
}: {
  hitos: HitoId[];
  series: Array<{ etiqueta: string; puntos: Array<number | null>; resaltar?: boolean }>;
}) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const ancho = 640;
  const alto = 260;
  const m = { izq: 44, der: 170, sup: 14, inf: 30 };
  const x = (i: number) => m.izq + (hitos.length === 1 ? 0 : (i / (hitos.length - 1)) * (ancho - m.izq - m.der));
  const y = (v: number) => m.sup + (1 - v / 100) * (alto - m.sup - m.inf);
  return (
    <Marco>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-auto" role="img">
        {ESCALA.map((t) => (
          <g key={t}>
            <line x1={m.izq} x2={ancho - m.der} y1={y(t)} y2={y(t)} stroke={REJILLA} />
            <text x={m.izq - 6} y={y(t) + 3} fontSize={10} fill={TINTA_3} textAnchor="end">
              {t} %
            </text>
          </g>
        ))}
        <line x1={m.izq} x2={ancho - m.der} y1={y(51)} y2={y(51)} stroke={TINTA_2} strokeDasharray="4 3" />
        {hitos.map((h, i) => (
          <text key={h} x={x(i)} y={alto - 8} fontSize={11} fill={TINTA_2} textAnchor="middle">
            {h}
          </text>
        ))}
        {series.map((s, si) => {
          const color = s.resaltar ? '#eb6834' : si < 3 ? ['#2a78d6', '#1baf7a', '#6250d6'][si] : '#b7bcc6';
          const pts = s.puntos.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const d = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p![0]},${p![1]}`).join(' ');
          const ultimo = [...pts].reverse().find(Boolean);
          return (
            <g key={s.etiqueta}>
              <path d={d} fill="none" stroke={color} strokeWidth={s.resaltar ? 3 : 2} />
              {pts.map((p, i) =>
                p ? (
                  <circle
                    key={i}
                    cx={p[0]}
                    cy={p[1]}
                    r={5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                    onMouseMove={(e) => mostrar(e, <><b>{s.etiqueta}</b><div>{hitos[i]}: {num(s.puntos[i])} %</div></>)}
                    onMouseLeave={ocultar}
                  />
                ) : null,
              )}
              {ultimo && (
                <text x={ultimo[0] + 10} y={ultimo[1] + 4} fontSize={11} fill="#14171c">
                  {s.etiqueta.length > 24 ? `${s.etiqueta.slice(0, 23)}…` : s.etiqueta}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {nodo}
    </Marco>
  );
}

export { HITO_COLOR };
