'use client';

import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  /** En escritorio, si el menú queda visible al lado del contenido. */
  fijo: boolean;
  onClose: () => void;
  onNavegar: () => void;
}

// Inicio siempre primero; luego carga, análisis, progresión e historial.
const modulos = [
  { ruta: '/', label: 'Inicio', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { ruta: '/cargar', label: 'Cargar datos', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3' },
  { ruta: '/analisis', label: 'Análisis', icon: 'M18 20V10 M12 20V4 M6 20v-6' },
  { ruta: '/progresion', label: 'Progresión', icon: 'M22 12L18 12 15 21 9 3 6 12 2 12' },
  { ruta: '/historial', label: 'Historial', icon: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18' },
];

export function Sidebar({ isOpen, fijo, onClose, onNavegar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/30 z-40 lg:hidden" aria-hidden="true" />}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#ced4da] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${fijo ? 'lg:translate-x-0' : 'lg:-translate-x-full'}`}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[#ced4da]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#1177d1] flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
            <div>
              <h2 className="font-bold text-[#212529] leading-tight">Perfil Hito</h2>
              <p className="text-[11px] text-[#6c757d]">Navegación</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar menú" title="Cerrar menú" className="p-2 rounded hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#212529]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="p-2 space-y-1 flex-1">
          {modulos.map((m) => {
            const activo = m.ruta === '/' ? pathname === '/' : pathname.startsWith(m.ruta);
            return (
              <button
                key={m.ruta}
                onClick={() => { router.push(m.ruta); onNavegar(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-left transition-colors ${
                  activo ? 'bg-[#1177d1] text-white' : 'text-[#212529] hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={m.icon} />
                </svg>
                {m.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#ced4da] text-[11px] text-[#6c757d]">
          Sociedad de Investigación · UAB · 2026
        </div>
      </aside>
    </>
  );
}
