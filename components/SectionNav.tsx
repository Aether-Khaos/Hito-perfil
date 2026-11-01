import { SeccionActiva } from '@/lib/types';

interface Props {
  activa: SeccionActiva;
  onChange: (s: SeccionActiva) => void;
}

const TABS: { id: SeccionActiva; label: string }[] = [
  { id: 'materia-dashboard', label: '📊 Dashboard por Materia' },
  { id: 'perfil-materia',    label: '📚 Perfil Detallado por Materia' },
  { id: 'estudiante',        label: '👤 Perfil Detallado por Estudiante' },
];

export function SectionNav({ activa, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-slate-800/80 pb-4">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-6 py-3 rounded-lg font-mono text-xs sm:text-sm transition cursor-pointer ${
            activa === t.id
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
