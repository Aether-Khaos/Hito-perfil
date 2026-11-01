'use client';
import { useState } from 'react';

interface Props {
  loading: boolean;
  onSubmit: (url: string) => void;
}

export function SheetForm({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState('');
  return (
    <div className="rounded-xl bg-slate-900/55 backdrop-blur-md border border-slate-800/90 p-6 sm:p-8 shadow-2xl">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        Sistema de Análisis y Perfiles por Hito
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Pega el enlace institucional de Google Sheets para auditar el rendimiento ordenado de mayor a menor calificación.
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
          {loading ? 'Procesando Auditoría...' : 'Cargar Enlace'}
        </button>
      </form>
    </div>
  );
}
