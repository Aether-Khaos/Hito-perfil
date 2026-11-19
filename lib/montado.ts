'use client';
import { useSyncExternalStore } from 'react';

const suscribir = () => () => {};

/** true solo en el navegador: permite leer localStorage sin desajustes de hidratación. */
export function useMontado(): boolean {
  return useSyncExternalStore(suscribir, () => true, () => false);
}
