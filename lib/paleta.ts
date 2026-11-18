/**
 * Paleta de datos (tema claro). Validada con el procedimiento de la guía de
 * visualización: categórica de 3 tonos (ΔE CVD ≥ 9,2) y rampa ordinal de un
 * solo tono para los niveles de logro. Los colores de estado se reservan para
 * el riesgo y siempre van con etiqueta.
 */
export const SERIE = ['#2a78d6', '#eb6834', '#1baf7a'] as const;

/** Inicio → Excepcional (rampa ordinal azul, el extremo claro supera 2:1). */
export const NIVEL_COLOR: Record<string, string> = {
  Inicio: '#86b6ef',
  Proceso: '#5598e7',
  Logrado: '#2a78d6',
  Destacado: '#1c5cab',
  Excepcional: '#0d366b',
};

export const TINTA_SOBRE_NIVEL: Record<string, string> = {
  Inicio: '#0b0b0b',
  Proceso: '#ffffff',
  Logrado: '#ffffff',
  Destacado: '#ffffff',
  Excepcional: '#ffffff',
};

export const ERROR_COLOR = { conceptual: SERIE[0], procedimental: SERIE[1], descuido: SERIE[2] } as const;

export const ESTADO = {
  bueno: '#0ca30c',
  aviso: '#fab219',
  serio: '#ec835a',
  critico: '#d03b3b',
} as const;

export const RIESGO = {
  alto: { color: ESTADO.critico, etiqueta: 'Riesgo alto', icono: '▲' },
  medio: { color: ESTADO.aviso, etiqueta: 'Riesgo medio', icono: '●' },
  bajo: { color: ESTADO.bueno, etiqueta: 'Riesgo bajo', icono: '✓' },
} as const;

export const HITO_COLOR = { Inicial: SERIE[0], Intermedio: SERIE[1], Final: SERIE[2] } as const;
