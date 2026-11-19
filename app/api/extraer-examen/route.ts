import { NextResponse } from 'next/server';

/**
 * Recibe el examen como archivo (PDF, Word .docx o texto) y devuelve su texto,
 * para que el apartado «Examen» lo ordene y lo guarde igual que si se pegara.
 */
export async function POST(request: Request) {
  try {
    const formulario = await request.formData();
    const archivo = formulario.get('archivo');
    if (!archivo || typeof archivo === 'string') {
      return NextResponse.json({ success: false, error: 'No se recibió ningún archivo.' }, { status: 400 });
    }
    const nombre = archivo.name.toLowerCase();
    const datos = Buffer.from(await archivo.arrayBuffer());
    if (datos.length > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'El archivo supera los 15 MB.' }, { status: 413 });
    }

    let texto = '';
    if (nombre.endsWith('.pdf')) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(datos));
      const { text } = await extractText(pdf, { mergePages: true });
      texto = text;
    } else if (nombre.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: datos });
      texto = value;
    } else if (nombre.endsWith('.txt') || nombre.endsWith('.md')) {
      texto = datos.toString('utf8');
    } else if (nombre.endsWith('.doc')) {
      return NextResponse.json(
        { success: false, error: 'El formato .doc antiguo no se puede leer. Ábrelo en Word y guárdalo como .docx o PDF.' },
        { status: 415 },
      );
    } else {
      return NextResponse.json({ success: false, error: 'Formato no admitido. Usa PDF, Word (.docx) o texto.' }, { status: 415 });
    }

    texto = texto.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!texto) {
      return NextResponse.json(
        { success: false, error: 'No se encontró texto en el archivo. Si es un PDF escaneado (imagen), copia y pega el texto.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ success: true, texto, caracteres: texto.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'desconocido';
    return NextResponse.json({ success: false, error: `No se pudo leer el archivo: ${msg}` }, { status: 500 });
  }
}
