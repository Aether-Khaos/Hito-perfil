import { FilaMateria } from '@/lib/types';
import { fmt } from '@/lib/utils';

interface Props {
  filas: FilaMateria[];
  showCorreo?: boolean;
}

export function RankingTable({ filas, showCorreo = true }: Props) {
  if (!filas.length) {
    return <div className="py-8 text-center text-slate-500 text-xs">No se encontraron registros.</div>;
  }
  return (
    <div className="overflow-x-auto pb-4 px-4">
      <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase">
            <th className="py-3 px-4">Puesto</th>
            <th className="py-3 px-4">Estudiante</th>
            {showCorreo && <th className="py-3 px-4">Correo</th>}
            <th className="py-3 px-4 text-center">P1</th>
            <th className="py-3 px-4 text-center">P2</th>
            <th className="py-3 px-4 text-center">P3</th>
            <th className="py-3 px-4 text-center">Promedio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-xs">
          {filas.map((f, idx) => (
            <tr key={`${f.Correo}-${idx}`} className="hover:bg-slate-800/30">
              <td className="py-3 px-4 text-cyan-400 font-bold">#{idx + 1}</td>
              <td className="py-3 px-4 text-white font-medium">{f.Nombre}</td>
              {showCorreo && <td className="py-3 px-4 text-slate-400">{f.Correo}</td>}
              <td className="py-3 px-4 text-center text-slate-300">{fmt(f.P1)}</td>
              <td className="py-3 px-4 text-center text-slate-300">{fmt(f.P2)}</td>
              <td className="py-3 px-4 text-center text-slate-300">{fmt(f.P3)}</td>
              <td className="py-3 px-4 text-center text-amber-400 font-bold">{fmt(f.Promedio)} pts</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
