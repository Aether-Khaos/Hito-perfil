'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false); // celular: menú desplegable
  const [fijo, setFijo] = useState(true); // escritorio: menú visible u oculto
  const pathname = usePathname();

  const alternarMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setFijo((v) => !v);
    else setMenuAbierto((v) => !v);
  };
  const cerrarMenu = () => {
    setMenuAbierto(false);
    if (window.matchMedia('(min-width: 1024px)').matches) setFijo(false);
  };

  // Los reportes imprimibles se muestran sin menú ni encabezado.
  if (pathname.startsWith('/reporte')) return <>{children}</>;

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#f8f9fa] text-[#212529] flex flex-col">
      <Sidebar isOpen={menuAbierto} fijo={fijo} onClose={cerrarMenu} onNavegar={() => setMenuAbierto(false)} />
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ${fijo ? 'lg:pl-64 print:pl-0' : ''}`}>
        <Header onToggleMenu={alternarMenu} menuVisible={fijo} />
        <main className="flex-1 w-full min-w-0 px-4 sm:px-8 lg:px-10 py-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
