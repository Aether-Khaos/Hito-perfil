'use client';
import { useEffect, useRef, useState } from 'react';
import type { PerfilEstudiante, ResultadoAuditoria } from '@/lib/types';
import type { AnalisisHito, PerfilDiagnostico } from '@/lib/analisis-hitos';
import { descargar, abrirReporte } from '@/components/Vistas';
import { enriquecerPerfilGeneral } from '@/lib/utils';

interface Props {
  resultado: ResultadoAuditoria;
  estudiante: PerfilEstudiante;
  posicion: { puesto: number; total: number } | null;
  promedioCurso: number;
  materiasSinPresentarse: string[];
  diagnostico?: { analisis: AnalisisHito; perfil: PerfilDiagnostico } | null;
}

const nombreArchivo = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '_').replace(/^_|_$/g, '');

const celda = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '';
  const t = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v);
  return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** CSV con los datos reales del perfil: solo lo que trae el archivo cargado, sin estimaciones. */
function csvPerfil({ resultado, estudiante, posicion, promedioCurso, materiasSinPresentarse }: Props): string {
  const filas: unknown[][] = [];
  const perfil = enriquecerPerfilGeneral(estudiante, {});
  filas.push(['Perfil del estudiante']);
  filas.push(['Nombre', estudiante.nombre]);
  filas.push(['Correo', estudiante.correo]);
  if (estudiante.noSePresento) {
    filas.push(['Situación', 'No se presentó al examen']);
  } else {
    filas.push(['Promedio general (pts)', estudiante.promedioGeneral]);
    if (posicion) filas.push(['Posición en el curso', `${posicion.puesto} de ${posicion.total}`]);
    filas.push(['Promedio del curso (pts)', promedioCurso]);
  }
  if (materiasSinPresentarse.length) filas.push(['No se presentó en', materiasSinPresentarse.join(' / ')]);
  filas.push([]);
  filas.push(['Materia', 'P1', 'P2', 'P3', 'Promedio del estudiante', 'Promedio del curso', 'Diferencia']);
  for (const [materia, m] of Object.entries(estudiante.materias)) {
    const lista = resultado.datosMaterias[materia] || [];
    const curso = lista.length ? lista.reduce((a, f) => a + f.Promedio, 0) / lista.length : null;
    filas.push([materia, m.p1, m.p2, m.p3, m.promedio, curso, curso === null ? null : m.promedio - curso]);
  }
  for (const materia of materiasSinPresentarse) filas.push([materia, '', '', '', 'No se presentó', '', '']);
  filas.push([]);
  if (perfil.fortalezas.length) filas.push(['Puntos fuertes', ...perfil.fortalezas]);
  if (perfil.debilidades.length) filas.push(['Áreas de mejora', ...perfil.debilidades]);
  if (perfil.consecuencias) filas.push(['Consecuencias en la carrera', perfil.consecuencias]);
  return '﻿' + filas.map((f) => f.map(celda).join(';')).join('\n');
}

export function DescargaPerfil(props: Props) {
  const { estudiante, diagnostico } = props;
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const imprimir = () => {
    setAbierto(false);
    const titulo = document.title;
    document.title = `Perfil_${nombreArchivo(estudiante.nombre)}`;
    setTimeout(() => {
      window.print();
      document.title = titulo;
    }, 50);
  };

  const opcion = 'block w-full text-left px-3 py-2 text-xs text-[#212529] hover:bg-[#f8f9fa]';

  return (
    <div ref={caja} className="no-imprimir relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Descargar perfil"
        title="Descargar perfil"
        aria-expanded={abierto}
        className="flex h-9 w-9 items-center justify-center rounded border border-[#1177d1] bg-white text-[#1177d1] hover:bg-[#1177d1] hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded border border-[#ced4da] bg-white shadow-lg">
          <button type="button" className={opcion} onClick={imprimir}>
            <strong className="block">Perfil en PDF</strong>
            <span className="text-[11px] text-[#6c757d]">Guarda lo que ves en pantalla</span>
          </button>
          <button
            type="button"
            className={`${opcion} border-t border-[#e9ecef]`}
            onClick={() => {
              setAbierto(false);
              descargar(`Perfil_${nombreArchivo(estudiante.nombre)}.csv`, csvPerfil(props));
            }}
          >
            <strong className="block">Datos del perfil (Excel / CSV)</strong>
            <span className="text-[11px] text-[#6c757d]">Notas por materia y P1–P3 del archivo</span>
          </button>
          {diagnostico && (
            <button
              type="button"
              className={`${opcion} border-t border-[#e9ecef]`}
              onClick={() => {
                setAbierto(false);
                abrirReporte({ tipo: 'estudiante', hito: diagnostico.analisis.hito, clave: diagnostico.perfil.clave });
              }}
            >
              <strong className="block">Reporte del diagnóstico (PDF)</strong>
              <span className="text-[11px] text-[#6c757d]">Por pregunta y competencia</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
