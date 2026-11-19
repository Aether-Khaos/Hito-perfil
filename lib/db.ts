import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Limpia errores típicos al copiar la cadena desde el panel de Neon:
 * prefijo `psql`, comillas, espacios o el nombre de la variable pegado dentro del valor.
 */
export function normalizarDatabaseUrl(valor: string | undefined): string | null {
  if (!valor) return null;
  let url = valor.trim();
  url = url.replace(/^DATABASE_URL\s*=\s*/i, '');
  url = url.replace(/^psql\s+/i, '');
  url = url.replace(/^['"]|['"]$/g, '').trim();
  if (!/^postgres(ql)?:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    if (!u.username || !u.hostname || u.pathname.length <= 1) return null;
  } catch {
    return null;
  }
  return url;
}

let cliente: NeonQueryFunction<false, false> | null = null;

/** Devuelve true si hay una DATABASE_URL válida; permite que las rutas funcionen sin base de datos. */
export function hayBaseDeDatos(): boolean {
  return normalizarDatabaseUrl(process.env.DATABASE_URL) !== null;
}

function obtenerCliente(): NeonQueryFunction<false, false> {
  if (cliente) return cliente;
  const url = normalizarDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    throw new Error(
      'DATABASE_URL no es válida. Formato esperado: postgresql://usuario:clave@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require'
    );
  }
  cliente = neon(url);
  return cliente;
}

/**
 * Etiqueta SQL perezosa: la conexión se crea en la primera consulta, no al importar el módulo.
 * Así un .env mal configurado no rompe la compilación de rutas que no usan la base.
 */
export const sql = ((strings: TemplateStringsArray, ...valores: unknown[]) =>
  obtenerCliente()(strings, ...valores)) as unknown as NeonQueryFunction<false, false>;
