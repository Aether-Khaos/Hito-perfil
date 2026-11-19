'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HITOS, type CargaHito, type HitoId } from '@/lib/analisis-hitos';
import { guardarCarga } from '@/lib/almacen-hitos';

/**
 * Carga directa de los libros de Excel del hito (por pregunta y por materia).
 * Deja los datos listos para Análisis (mismo formato que Historial) y guarda
 * el hito en el navegador para el diagnóstico, la progresión y los reportes.
 */
export function CargaExcel() {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [hito, setHito] = useState<HitoId>('Inicial');
  const [anio, setAnio] = useState('2026');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const subir = async () => {
    const archivos = Array.from(entrada.current?.files ?? []);
    if (!archivos.length) {
      setMensaje({ ok: false, texto: 'Selecciona al menos el archivo «Calificaciones por pregunta».' });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      const f = new FormData();
      for (const a of archivos) f.append('archivo', a);
      const res = await fetch('/api/libro', { method: 'POST', body: f });
      const data = await res.json();
      if (!data.success || !data.registros?.length) {
        setMensaje({ ok: false, texto: data.error ?? 'El archivo no tiene calificaciones por pregunta.' });
        return;
      }
      const carga: CargaHito = {
        hito,
        archivos: archivos.map((a) => a.name),
        cargadoEn: new Date().toISOString(),
        registros: data.registros,
        consolidado: data.consolidado ?? [],
        advertencias: data.advertencias ?? [],
      };
      const aviso = guardarCarga(carga);
      // Mismo formato que usa Historial → Análisis.
      sessionStorage.setItem(
        'historial_data',
        JSON.stringify({
          success: true,
          datosMaterias: data.datosMaterias,
          estadisticasMaterias: data.estadisticasMaterias,
          perfilesEstudiantes: data.perfilesEstudiantes,
        }),
      );
      sessionStorage.setItem('historial_filtro', JSON.stringify({ anio, nivel: hito }));
      setMensaje({ ok: true, texto: `Hito ${hito}: ${data.perfilesEstudiantes.length} estudiantes analizados.${aviso ? ` ${aviso}` : ''} Abriendo Análisis…` });
      setTimeout(() => router.push('/analisis'), 600);
    } catch {
      setMensaje({ ok: false, texto: 'Error de red al procesar el archivo.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white border border-[#ced4da] rounded p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-[#212529]">1. Calificaciones por pregunta (Excel)</h2>
        <p className="text-xs text-[#6c757d] mt-1">
          Sube «Calificaciones por pregunta» y, si lo tienes, «Calificaciones por materia» (puedes elegir los dos a la vez). Activa el diagnóstico por pregunta, los
          reportes en PDF y el avance entre hitos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#212529] uppercase">Hito</label>
          <select value={hito} onChange={(e) => setHito(e.target.value as HitoId)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm">
            {HITOS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#212529] uppercase">Año</label>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full mt-1 bg-white border border-[#ced4da] text-[#212529] rounded px-3 py-2 text-sm">
            {['2024', '2025', '2026'].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#212529] uppercase">Archivos .xlsx</label>
          <input ref={entrada} type="file" multiple accept=".xlsx,.xlsm" className="w-full mt-1 text-sm" />
        </div>
      </div>
      <button onClick={subir} disabled={cargando} className="w-full sm:w-auto bg-[#1177d1] hover:bg-[#0d63b0] text-white font-semibold rounded px-6 py-2.5 text-sm">
        {cargando ? 'Analizando…' : `Analizar como Hito ${hito}`}
      </button>
      {mensaje && (
        <div className={`rounded border px-3 py-2 text-sm ${mensaje.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{mensaje.texto}</div>
      )}
    </div>
  );
}
