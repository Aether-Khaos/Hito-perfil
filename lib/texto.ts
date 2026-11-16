/** Utilidades de texto compartidas por el catálogo y el lector de libros. */

/** Minúsculas, sin acentos, sin signos y con espacios colapsados. */
export function normalizarTexto(valor: string): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Clave de comparación tolerante a plurales y variantes de nombre.
 * "Estructura de datos" y "Estructuras de Datos" producen la misma clave.
 */
export function claveMateria(valor: string): string {
  const base = normalizarTexto(valor);
  return base
    .split(' ')
    .map((palabra) => (palabra.length > 4 && palabra.endsWith('s') ? palabra.slice(0, -1) : palabra))
    .join(' ');
}

/** Quita el prefijo numérico de los nombres exportados por rúbricas tipo "1. APELLIDO Nombre". */
export function sinPrefijoNumerico(valor: string): string {
  return String(valor ?? '').replace(/^\s*\d+\s*[.)-]\s*/, '').trim();
}

/** Formatea un número con coma decimal, o un guion cuando no hay dato. */
export function formatearDecimal(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return valor.toFixed(decimales).replace('.', ',');
}
