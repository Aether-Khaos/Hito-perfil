'use client';

import { useState } from 'react';

export default function Cargar() {
  const [url, setUrl] = useState('');
  const [anio, setAnio] = useState('2026');
  const [nivel, setNivel] = useState('Inicial');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/perfiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), anio, nivel }),
      });
      const data = await res.json();
      if (data.success) {
        setMensaje({ tipo: 'ok', texto: `Guardado: ${data.perfilesEstudiantes?.length ?? 0} estudiantes en ${anio}/${nivel}.` });
        setUrl('');
      } else {
        setMensaje({ tipo: 'error', texto: data.error ?? 'Error desconocido' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de red.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Cargar datos</h1>
        <p className="text-sm text-[#6c757d] mt-1">Importa un Google Sheet y guárdalo en la base de datos.</p>
      </div>
      <div className="bg-white border border-[#ced4da] rounded p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#212529] uppercase">URL del Google Sheet</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm focus:border-[#1177d1] focus:outline-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#212529] uppercase">Año</label>
            <select value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm focus:border-[#1177d1] focus:outline-none">
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#212529] uppercase">Nivel</label>
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm focus:border-[#1177d1] focus:outline-none">
              <option value="Inicial">Inicial</option><option value="Intermedio">Intermedio</option><option value="Avanzado">Avanzado</option>
            </select>
          </div>
        </div>
        <button onClick={cargar} disabled={loading || !url.trim()} className="w-full sm:w-auto bg-[#1177d1] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#0d62b0] disabled:bg-gray-300 disabled:text-gray-500 transition-colors">
          {loading ? 'Cargando...' : 'Cargar y guardar'}
        </button>
        {mensaje && <div className={`text-sm p-3 rounded border ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{mensaje.texto}</div>}
      </div>
    </div>
  );
}