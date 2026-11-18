/**
 * Colores de la interfaz, alineados con la rama main.
 * Los niveles van de rojo (Inicio) a verde (Excepcional), igual que en main,
 * y siempre se muestran con su nombre: el color nunca es la única señal.
 */
export const AZUL = '#1177d1';
export const GRIS = '#6c757d';
export const GRIS_CLARO = '#e9ecef';

export const NIVEL_COLOR: Record<string, string> = {
  Inicio: '#b91c1c',
  Proceso: '#ea580c',
  Logrado: '#f59e0b',
  Destacado: '#1177d1',
  Excepcional: '#15803d',
};

export const TINTA_SOBRE_NIVEL: Record<string, string> = {
  Inicio: '#ffffff',
  Proceso: '#ffffff',
  Logrado: '#212529',
  Destacado: '#ffffff',
  Excepcional: '#ffffff',
};

export const ERROR_COLOR = { conceptual: '#b91c1c', procedimental: '#f59e0b', descuido: '#1177d1' } as const;

export const RIESGO = {
  alto: { color: '#b91c1c', fondo: 'bg-red-50 border-red-200 text-red-800', etiqueta: 'Necesita apoyo urgente', icono: '!' },
  medio: { color: '#d97706', fondo: 'bg-amber-50 border-amber-200 text-amber-800', etiqueta: 'Necesita seguimiento', icono: '•' },
  bajo: { color: '#15803d', fondo: 'bg-green-50 border-green-200 text-green-800', etiqueta: 'Va bien', icono: '✓' },
} as const;

export const HITO_COLOR = { Inicial: '#1177d1', Intermedio: '#ea580c', Final: '#15803d' } as const;
