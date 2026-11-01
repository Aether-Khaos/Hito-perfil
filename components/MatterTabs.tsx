interface Props {
  materias: string[];
  activa: string;
  onChange: (m: string) => void;
}

export function MatterTabs({ materias, activa, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {materias.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-4 py-2.5 rounded-lg font-mono text-xs transition cursor-pointer ${
            activa === m
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
