'use client';

import { FilaMateria } from '@/lib/types';
import { fmt } from '@/lib/utils';

interface Props {
  filas: FilaMateria[];
  showCorreo?: boolean;
  /** Si se indica, cada fila muestra el botón «Ver perfil». */
  onVerPerfil?: (nombre: string) => void;
}

export function RankingTable({ filas, showCorreo = true, onVerPerfil }: Props) {
  return (
    <div className="bg-white border border-neutral-300 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-neutral-100 text-black">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              {showCorreo && <th className="text-left px-4 py-2 font-medium">Correo</th>}
              <th className="text-right px-4 py-2 font-medium">P1</th>
              <th className="text-right px-4 py-2 font-medium">P2</th>
              <th className="text-right px-4 py-2 font-medium">P3</th>
              <th className="text-right px-4 py-2 font-medium">Promedio</th>
              {onVerPerfil && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-t border-neutral-200 hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                <td className="px-4 py-2 text-black font-medium">{f.Nombre}</td>
                {showCorreo && <td className="px-4 py-2 text-neutral-500 truncate max-w-[180px]">{f.Correo || '—'}</td>}
                <td className="px-4 py-2 text-right text-black">{fmt(f.P1)}</td>
                <td className="px-4 py-2 text-right text-black">{fmt(f.P2)}</td>
                <td className="px-4 py-2 text-right text-black">{fmt(f.P3)}</td>
                <td className="px-4 py-2 text-right font-semibold text-black">{fmt(f.Promedio)}</td>
                {onVerPerfil && (
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onVerPerfil(f.Nombre)}
                      className="whitespace-nowrap rounded border border-[#1177d1] px-3 py-1 text-xs font-semibold text-[#1177d1] hover:bg-[#1177d1] hover:text-white"
                    >
                      Ver perfil
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}