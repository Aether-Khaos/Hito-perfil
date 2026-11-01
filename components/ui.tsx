interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className = '' }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full sm:w-80 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200 ${className}`}
    />
  );
}

type Tone = 'neutral' | 'cyan' | 'emerald' | 'rose';

const valueTone: Record<Tone, string> = {
  neutral: 'text-white',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};
const labelTone: Record<Tone, string> = {
  neutral: 'text-slate-400',
  cyan: 'text-slate-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

export function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-1 shadow-lg">
      <span className={`text-xs ${labelTone[tone]}`}>{label}</span>
      <div className={`text-2xl font-bold ${valueTone[tone]}`}>{value}</div>
    </div>
  );
}
