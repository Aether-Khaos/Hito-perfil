'use client';
/**
 * Lee los hitos cargados desde Excel (guardados en el navegador) y devuelve
 * su análisis. Lo usan Análisis, Progresión y los reportes.
 */
import { useMemo } from 'react';
import { HITOS, analizarHito, compararHitos, claveEstudiante, type AnalisisHito, type HitoId } from './analisis-hitos';
import { leerCargas } from './almacen-hitos';
import { useMontado } from './montado';

export function useHitos(preferido?: string | null) {
  const montado = useMontado();
  return useMemo(() => {
    if (!montado) return { porHito: {}, actual: null, comparacion: null } as const;
    const cargas = leerCargas();
    const porHito: Partial<Record<HitoId, AnalisisHito>> = {};
    for (const h of HITOS) if (cargas[h]) porHito[h] = analizarHito(cargas[h]!);
    const lista = HITOS.filter((h) => porHito[h]).map((h) => porHito[h]!);
    const pref = preferido ? lista.find((a) => a.hito.toLowerCase() === preferido.toLowerCase()) : undefined;
    // El hito preferido (filtro) o el último cargado.
    const actual = pref ?? [...lista].sort((a, b) => b.cargadoEn.localeCompare(a.cargadoEn))[0] ?? null;
    return { porHito, actual, comparacion: compararHitos(lista) };
  }, [montado, preferido]);
}

export function buscarPerfil(analisis: AnalisisHito | null, nombre: string) {
  if (!analisis) return null;
  const clave = claveEstudiante(nombre);
  return analisis.estudiantes.find((e) => e.clave === clave) ?? null;
}
