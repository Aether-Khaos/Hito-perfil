'use client';
/**
 * Persistencia local por hito (navegador). Solo se guardan las entradas
 * compactas del libro; el análisis se recalcula al abrir la página.
 * Los datos nunca salen del equipo donde se cargaron.
 */
import { HITOS, type CargaHito, type HitoId } from './analisis-hitos';

const CLAVE = 'hito-perfil:cargas:v1';

let memoria: Partial<Record<HitoId, CargaHito>> = {};

export function leerCargas(): Partial<Record<HitoId, CargaHito>> {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (bruto) memoria = JSON.parse(bruto);
  } catch {
    /* almacenamiento no disponible: se usa memoria */
  }
  return memoria;
}

export function guardarCarga(carga: CargaHito): string | null {
  memoria = { ...memoria, [carga.hito]: carga };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(memoria));
    return null;
  } catch {
    return 'El navegador no permitió guardar los datos: se conservarán solo mientras la página esté abierta.';
  }
}

export function borrarCarga(hito: HitoId) {
  const copia = { ...memoria };
  delete copia[hito];
  memoria = copia;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(memoria));
  } catch {
    /* sin almacenamiento */
  }
}

export function hitosCargados(cargas: Partial<Record<HitoId, CargaHito>>): HitoId[] {
  return HITOS.filter((h) => !!cargas[h]);
}
