'use client';

interface Props {
  materias: string[];
  activa: string;
  onChange: (m: string) => void;
}

export function MatterTabs({ materias, activa, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {materias.map((m) => {
        const isActive = m === activa;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-3 py-1.5 rounded-lg text-sm border whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}