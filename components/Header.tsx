'use client';

interface HeaderProps {
  onToggleMenu: () => void;
}

export function Header({ onToggleMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-[#ced4da]">
      <div className="flex items-center justify-between px-6 sm:px-8 lg:px-10 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMenu}
            aria-label="Abrir menú"
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#212529]">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#1177d1] flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#212529] leading-tight">Perfil Hito</h1>
              <p className="text-[11px] text-[#6c757d]">Auditoría Académica · UAB</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block text-xs text-[#6c757d]">
          Ingeniería de Sistemas
        </div>
      </div>
    </header>
  );
}