'use client';

interface Segmento {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segmentos: Segmento[];
  size?: number;
  thickness?: number;
  centroLabel?: string;
  centroValue?: string;
}

export function DonutChart({
  segmentos,
  size = 180,
  thickness = 28,
  centroLabel,
  centroValue,
}: DonutChartProps) {
  const total = segmentos.reduce((a, s) => a + s.value, 0);
  const radio = (size - thickness) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const centro = size / 2;

  let acumulado = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Gráfico */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Fondo */}
          <circle
            cx={centro}
            cy={centro}
            r={radio}
            fill="none"
            stroke="#e9ecef"
            strokeWidth={thickness}
          />
          {/* Segmentos */}
          {total > 0 &&
            segmentos.map((s, i) => {
              const fraccion = s.value / total;
              const dash = fraccion * circunferencia;
              const offset = -acumulado * circunferencia;
              acumulado += fraccion;
              return (
                <circle
                  key={i}
                  cx={centro}
                  cy={centro}
                  r={radio}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circunferencia - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        {/* Centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centroValue && (
            <span className="text-2xl font-bold text-[#212529] leading-none">{centroValue}</span>
          )}
          {centroLabel && (
            <span className="text-[10px] font-semibold text-[#6c757d] uppercase tracking-wide mt-1 text-center px-2">
              {centroLabel}
            </span>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex-1 w-full space-y-2">
        {segmentos.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 text-[#212529] truncate">{s.label}</span>
              <span className="font-bold text-[#212529] tabular-nums">{s.value}</span>
              <span className="text-xs text-[#6c757d] tabular-nums w-12 text-right">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function MiniBar({
  value,
  max,
  tone = 'cyan',
}: {
  value: number;
  max: number;
  tone?: 'cyan' | 'emerald' | 'rose';
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    tone === 'emerald' ? 'bg-green-700' : tone === 'rose' ? 'bg-red-700' : 'bg-[#1177d1]';
  return (
    <div className="w-full bg-[#e9ecef] rounded h-1.5 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}