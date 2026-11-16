'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] text-[#212529] flex flex-col">
      <Sidebar isOpen={menuAbierto} onClose={() => setMenuAbierto(false)} />
      <div className="flex-1 flex flex-col">
        <Header onToggleMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 w-full px-6 sm:px-8 lg:px-10 py-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}