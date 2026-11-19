'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  // Los reportes imprimibles se muestran sin menú ni encabezado.
  if (pathname.startsWith('/reporte')) return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] text-[#212529] flex flex-col">
      <Sidebar isOpen={menuAbierto} onClose={() => setMenuAbierto(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onToggleMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 w-full min-w-0 px-4 sm:px-8 lg:px-10 py-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
