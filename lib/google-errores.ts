/**
 * Traducción de errores de Google a instrucciones accionables.
 *
 * La ruta de ingesta puede fallar por cuatro causas distintas, y cada una se
 * resuelve de forma diferente. Este módulo las distingue y extrae el enlace de
 * habilitación cuando Google lo incluye en el mensaje.
 */

export type CausaGoogle = 'api-deshabilitada' | 'sin-permiso' | 'credenciales' | 'cuota' | 'desconocida';

export interface DiagnosticoGoogle {
  causa: CausaGoogle;
  titulo: string;
  /** Qué debe hacer la persona que administra el libro. */
  instruccion: string;
  /** Enlace de habilitación o de compartir, cuando Google lo proporciona. */
  enlace: string | null;
  /** Si conviene intentar la exportación pública como alternativa. */
  intentarExportacion: boolean;
}

const ENLACE_HABILITAR = /https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s)"']+/;

export function clasificarErrorGoogle(mensaje: string): DiagnosticoGoogle {
  const texto = String(mensaje || '');
  const enlace = texto.match(ENLACE_HABILITAR)?.[0] ?? null;

  if (/has not been used in project|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(texto)) {
    return {
      causa: 'api-deshabilitada',
      titulo: 'La API de Google Sheets está desactivada en el proyecto de la cuenta de servicio',
      instruccion:
        'Abre el enlace, pulsa «Habilitar», espera dos o tres minutos y vuelve a intentar. Mientras tanto el sistema puede leer el libro si está compartido con enlace.',
      enlace,
      intentarExportacion: true,
    };
  }

  if (/does not have permission|PERMISSION_DENIED|The caller does not have permission|not shared/i.test(texto)) {
    return {
      causa: 'sin-permiso',
      titulo: 'El libro no está compartido con la cuenta de servicio',
      instruccion:
        'Comparte el libro con el correo de la cuenta de servicio (permiso Lector) o cámbialo a «cualquiera con el enlace puede ver».',
      enlace: null,
      intentarExportacion: true,
    };
  }

  if (/invalid_grant|Could not load the default credentials|ENOENT|no such file|keyFile/i.test(texto)) {
    return {
      causa: 'credenciales',
      titulo: 'No se encontraron credenciales válidas de Google',
      instruccion:
        'Coloca el archivo de la cuenta de servicio como keys.json en la raíz del proyecto o define GOOGLE_CREDENTIALS_JSON. También puedes subir el archivo .xlsx.',
      enlace: null,
      intentarExportacion: true,
    };
  }

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(texto)) {
    return {
      causa: 'cuota',
      titulo: 'Se agotó la cuota diaria de la API de Google Sheets',
      instruccion: 'Espera a que se restablezca la cuota o sube el archivo .xlsx para continuar.',
      enlace: null,
      intentarExportacion: true,
    };
  }

  return {
    causa: 'desconocida',
    titulo: 'No se pudo leer el libro desde Google Sheets',
    instruccion: 'Sube el archivo .xlsx: el sistema lo procesa sin credenciales y con el mismo motor.',
    enlace,
    intentarExportacion: true,
  };
}

/** URL de exportación directa del libro (no requiere API, solo permiso de lectura). */
export function urlExportacion(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
}
