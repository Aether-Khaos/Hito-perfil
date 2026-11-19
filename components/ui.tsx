'use client';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className = '' }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white border border-neutral-300 text-black placeholder-neutral-400 rounded-lg px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none ${className}`}
    />
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative' | 'neutral';
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  const toneColor =
    tone === 'positive' ? 'text-emerald-700' :
    tone === 'negative' ? 'text-rose-700' :
    'text-black';

  return (
    <div className="bg-white border border-neutral-300 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneColor}`}>{value}</p>
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}