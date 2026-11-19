import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

interface CuentaServicio {
  type: string;
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * Lee la cuenta de servicio desde GOOGLE_CREDENTIALS_JSON (Vercel) o desde keys.json (local),
 * valida que sea realmente una cuenta de servicio y construye un cliente JWT explícito.
 * Así se evita `keyFile`/`keyFilename`, que google-auth-library marca como obsoletos.
 */
export function crearClienteGoogle() {
  let bruto: string | undefined = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!bruto) {
    const ruta = path.join(process.cwd(), 'keys.json');
    if (!existsSync(ruta)) {
      throw new Error(
        'No hay credenciales de Google: define GOOGLE_CREDENTIALS_JSON en .env.local o coloca keys.json en la raíz del proyecto.'
      );
    }
    bruto = readFileSync(ruta, 'utf8');
  }

  let cred: CuentaServicio;
  try {
    cred = JSON.parse(bruto) as CuentaServicio;
  } catch {
    throw new Error('Las credenciales de Google no son un JSON válido.');
  }

  if (cred.type !== 'service_account' || !cred.client_email || !cred.private_key) {
    throw new Error('Las credenciales de Google deben ser de una cuenta de servicio (type: service_account).');
  }

  return new google.auth.JWT({
    email: cred.client_email,
    // En variables de entorno los saltos de línea suelen llegar escapados
    key: cred.private_key.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });
}

/** Traduce los errores más comunes de la API de Google a mensajes accionables. */
export function explicarErrorGoogle(error: unknown): { mensaje: string; status: number } {
  const e = error as { code?: number; message?: string; errors?: { reason?: string }[] };
  const texto = e?.message ?? 'Error desconocido';
  const razon = e?.errors?.[0]?.reason ?? '';

  if (/has not been used in project|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(texto + razon)) {
    const proyecto = texto.match(/project (\d+)/)?.[1];
    const enlace = `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview${proyecto ? `?project=${proyecto}` : ''}`;
    return {
      mensaje: `La API de Google Sheets no está habilitada en el proyecto de Google Cloud${proyecto ? ` ${proyecto}` : ''}. Habilítala en ${enlace} y espera 2–5 minutos.`,
      status: 503,
    };
  }
  if (e?.code === 403 || /permission|PERMISSION_DENIED/i.test(texto)) {
    return {
      mensaje: 'La cuenta de servicio no tiene acceso a la hoja. Compártela (Lector) con el client_email de keys.json.',
      status: 403,
    };
  }
  if (e?.code === 404) {
    return { mensaje: 'No se encontró la hoja de cálculo. Revisa la URL.', status: 404 };
  }
  return { mensaje: texto, status: 500 };
}
