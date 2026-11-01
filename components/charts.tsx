import { RangoDistribucion } from '@/lib/types';

const barTone: Record<string, string> = {
  rose: 'bg-rose-500/70',
  amber: 'bg-amber-500/70',
  yellow: 'bg-yellow-500/70',
  cyan: 'bg-cyan-500/70',
  emerald: 'bg-emerald-500/70',
};

export function DistributionChart({ rangos, total }: { rangos: RangoDistribucion[]; total: number }) {
  const max = Math.max(...rangos.map((r) => r.count), 1);
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-cyan-400 text-xs tracking-wider uppercase font-bold">Distribución de Promedios</h4>
        <span className="text-[10px] text-slate-500">{total} estudiantes</span>
      </div>
      <div className="space-y-2">
        {rangos.map((r) => (
          <div key={r.label} className="flex items-center gap-3 text-xs">
            <span className="w-16 text-slate-400 text-right font-mono">{r.label}</span>
            <div className="flex-1 h-4 bg-slate-950/80 rounded overflow-hidden border border-slate-800">
              <div
                className={`h-full ${barTone[r.color]} transition-all`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-10 text-slate-300 font-mono text-right">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniBar({ value, max, tone = 'cyan' }: { value: number; max: number; tone?: 'cyan' | 'emerald' | 'rose' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const map = { cyan: 'bg-cyan-500/70', emerald: 'bg-emerald-500/70', rose: 'bg-rose-500/70' };
  return (
    <div className="w-full h-1.5 bg-slate-950/80 rounded overflow-hidden">
      <div className={`h-full ${map[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
