'use client';

interface HeaderProps {
  onToggleMenu: () => void;
  /** En escritorio: si el menú lateral está visible (oculta el logo duplicado). */
  menuVisible?: boolean;
}

export function Header({ onToggleMenu, menuVisible = false }: HeaderProps) {
  return (
    <header className="no-imprimir sticky top-0 z-30 w-full bg-white border-b border-[#ced4da]">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-8 lg:px-10 py-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMenu}
            aria-label="Abrir o cerrar el menú"
            title="Abrir o cerrar el menú"
            className="p-2 rounded hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#212529]">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className={`flex items-center gap-3 ${menuVisible ? 'lg:hidden' : ''}`}>
            <div className="w-9 h-9 rounded bg-[#1177d1] flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#212529] leading-tight">Perfil Hito</h1>
              <p className="text-[11px] text-[#6c757d]">Diagnóstico por hitos · UAB</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block shrink-0 whitespace-nowrap text-right leading-tight">
          <span className="block text-xs font-semibold text-[#212529]">Ingeniería de Sistemas</span>
          <span className="block text-[11px] text-[#6c757d]">Universidad Adventista de Bolivia</span>
        </div>
      </div>
    </header>
  );
}