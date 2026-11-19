'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ANIOS = ['2024', '2025', '2026'];
const NIVELES = ['Inicial', 'Intermedio', 'Avanzado'];

export default function Historial() {
  const router = useRouter();
  const [anio, setAnio] = useState('');
  const [nivel, setNivel] = useState('');
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (anio) params.set('anio', anio);
      if (nivel) params.set('nivel', nivel);
      const res = await fetch(`/api/historial?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.perfilesEstudiantes?.length > 0) {
        sessionStorage.setItem('historial_data', JSON.stringify(data));
        sessionStorage.setItem('historial_filtro', JSON.stringify({ anio, nivel }));
        router.push('/analisis');
      } else if (data.success) {
        alert('No hay datos para ese filtro.');
      } else {
        alert(data.error ?? 'Error desconocido');
      }
    } catch {
      alert('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Historial</h1>
        <p className="text-sm text-[#6c757d] mt-1">Consulta los datos guardados por año y nivel.</p>
      </div>
      <div className="bg-white border border-[#ced4da] rounded p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#212529] uppercase">Año</label>
            <select value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm focus:border-[#1177d1] focus:outline-none">
              <option value="">Todos los años</option>
              {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#212529] uppercase">Nivel</label>
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm focus:border-[#1177d1] focus:outline-none">
              <option value="">Todos los niveles</option>
              {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <button onClick={consultar} disabled={loading} className="w-full sm:w-auto bg-[#1177d1] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#0d62b0] disabled:bg-gray-300 disabled:text-gray-500 transition-colors">
          {loading ? 'Consultando...' : 'Ver análisis'}
        </button>
      </div>
    </div>
  );
}