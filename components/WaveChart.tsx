'use client';

import { useEffect, useState } from 'react';

export interface PuntoOnda {
  label: string;
  valor: number;
  color: string;
}

interface WaveChartProps {
  puntos: PuntoOnda[];
  escalaMax: number;
  altura?: number;
  ancho?: number;
  velocidadMs?: number;
}

export function WaveChart({
  puntos,
  escalaMax,
  altura = 240,
  ancho = 720,
  velocidadMs = 400,
}: WaveChartProps) {
  const [avance, setAvance] = useState(0); // 0 a puntos.length - 1

  // Reiniciar cuando cambian los puntos
  useEffect(() => {
    setAvance(0);
    if (puntos.length === 0) return;

    let actual = 0;
    const intervalo = setInterval(() => {
      actual++;
      if (actual >= puntos.length) {
        clearInterval(intervalo);
        return;
      }
      setAvance(actual);
    }, velocidadMs);

    return () => clearInterval(intervalo);
  }, [puntos, velocidadMs]);

  if (puntos.length === 0) return null;

  const padIzq = 48;
  const padDer = 28;
  const padTop = 28;
  const padBottom = 44;
  const anchoUtil = ancho - padIzq - padDer;
  const altoUtil = altura - padTop - padBottom;

  const n = puntos.length;
  const x = (i: number) => n === 1 ? padIzq + anchoUtil / 2 : padIzq + (anchoUtil / (n - 1)) * i;
  const y = (valor: number) => padTop + altoUtil - (Math.max(0, Math.min(valor, escalaMax)) / escalaMax) * altoUtil;

  // Coordenadas de todos los puntos
  const coords = puntos.map((p, i) => ({ x: x(i), y: y(p.valor), ...p }));

  // Path que conecta hasta el punto actual
  const pathHastaActual = coords
    .slice(0, avance + 1)
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  // Path completo (para el área gris de "por recorrer")
  const pathCompleto = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  const gridNiveles = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-white border border-[#ced4da] rounded p-4 overflow-x-auto">
      <svg width={ancho} height={altura} className="block mx-auto">
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1177d1" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1177d1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {gridNiveles.map((g, i) => {
          const valor = escalaMax * g;
          return (
            <g key={i}>
              <line
                x1={padIzq}
                y1={y(valor)}
                x2={ancho - padDer}
                y2={y(valor)}
                stroke="#e9ecef"
                strokeWidth={1}
              />
              <text
                x={padIzq - 8}
                y={y(valor) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6c757d"
                fontWeight="600"
              >
                {valor.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Línea gris de "por recorrer" (path completo) */}
        <path
          d={pathCompleto}
          fill="none"
          stroke="#e9ecef"
          strokeWidth={2}
          strokeDasharray="4 4"
        />

        {/* Área bajo la curva activa */}
        {avance > 0 && coords.length > 1 && (
          <path
            d={`${pathHastaActual} L ${coords[avance].x} ${padTop + altoUtil} L ${coords[0].x} ${padTop + altoUtil} Z`}
            fill="url(#waveFill)"
          />
        )}

        {/* Línea principal que avanza */}
        <path
          d={pathHastaActual}
          fill="none"
          stroke="#1177d1"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos visitados con etiqueta */}
        {coords.slice(0, avance + 1).map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={8} fill={c.color} fillOpacity={0.15} />
            <circle cx={c.x} cy={c.y} r={5} fill="#ffffff" stroke={c.color} strokeWidth={2.5} />
            <text
              x={c.x}
              y={c.y - 14}
              textAnchor="middle"
              fontSize="11"
              fill="#212529"
              fontWeight="700"
            >
              {c.valor.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Etiquetas X (todas, siempre visibles) */}
        {coords.map((c, i) => (
          <text
            key={i}
            x={c.x}
            y={altura - padBottom + 22}
            textAnchor="middle"
            fontSize="11"
            fill={i <= avance ? '#212529' : '#adb5bd'}
            fontWeight={i <= avance ? '700' : '500'}
          >
            {c.label}
          </text>
        ))}

        {/* Eje X */}
        <line
          x1={padIzq}
          y1={padTop + altoUtil}
          x2={ancho - padDer}
          y2={padTop + altoUtil}
          stroke="#ced4da"
          strokeWidth={1}
        />
      </svg>

      {/* Barra de progreso */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1 bg-[#e9ecef] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1177d1] transition-all duration-300"
            style={{ width: `${puntos.length > 1 ? ((avance / (puntos.length - 1)) * 100) : 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-[#6c757d] uppercase tabular-nums">
          {avance + 1} / {puntos.length}
        </span>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {puntos.map((p, i) => (
          <span
            key={i}
            className={`flex items-center gap-1.5 text-[11px] ${i <= avance ? 'text-[#212529]' : 'text-[#adb5bd]'}`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: i <= avance ? p.color : '#e9ecef' }}
            />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}