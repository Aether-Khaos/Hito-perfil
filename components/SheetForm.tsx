'use client';
import { useRef, useState } from 'react';

interface Props {
  loading: boolean;
  onSubmit: (url: string) => void;
  onArchivo?: (archivo: File) => void;
}

export function SheetForm({ loading, onSubmit, onArchivo }: Props) {
  const [url, setUrl] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const entradaArchivo = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl bg-slate-900/55 backdrop-blur-md border border-slate-800/90 p-6 sm:p-8 shadow-2xl">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        Sistema de Análisis y Perfiles por Hito
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Pega el enlace del libro en Google Sheets o sube el archivo de Excel. El sistema normaliza cada
        evaluación con su puntaje máximo y genera el perfil de competencias por estudiante.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(url);
        }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full flex-1 px-4 py-3.5 rounded-lg bg-[#09101a] border border-slate-800 focus:border-cyan-500 text-slate-200 font-mono text-xs sm:text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="py-3.5 px-8 rounded-lg bg-[#3cb4cb] hover:bg-[#32a3b9] text-slate-950 font-semibold text-sm transition cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Procesando…' : 'Cargar enlace'}
        </button>
      </form>

      {onArchivo && (
        <div className="mt-5 border-t border-slate-800 pt-5">
          <p className="text-slate-500 text-xs mb-3">
            Sin credenciales de Google: sube el archivo <span className="font-mono text-slate-400">.xlsx</span> del
            hito. No se envía a ningún servicio externo, se procesa en el servidor de la aplicación.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              ref={entradaArchivo}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                setNombreArchivo(archivo ? archivo.name : '');
              }}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 file:cursor-pointer"
            />
            <button
              type="button"
              disabled={loading || !nombreArchivo}
              onClick={() => {
                const archivo = entradaArchivo.current?.files?.[0];
                if (archivo) onArchivo(archivo);
              }}
              className="py-2.5 px-6 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold text-xs transition hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-40 shrink-0"
            >
              Analizar archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
