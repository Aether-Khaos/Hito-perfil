import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { parsearExamenGoogleDoc, RubricasMateria } from '@/lib/utils';

const sql = neon(process.env.DATABASE_URL!);

function normalizarNombreMateria(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const anio = searchParams.get('anio');
    const nivel = searchParams.get('nivel');

    const rows =
      anio && nivel
        ? await sql`
            SELECT m.nombre AS materia, r.evaluacion, r.contenido
            FROM rubricas r
            JOIN materias m ON m.id = r.materia_id
            WHERE r.anio = ${Number(anio)} AND LOWER(TRIM(r.nivel)) = LOWER(TRIM(${nivel}))
            ORDER BY r.id ASC
          `
        : anio
          ? await sql`
              SELECT m.nombre AS materia, r.evaluacion, r.contenido
              FROM rubricas r
              JOIN materias m ON m.id = r.materia_id
              WHERE r.anio = ${Number(anio)}
              ORDER BY r.id ASC
            `
          : nivel
            ? await sql`
                SELECT m.nombre AS materia, r.evaluacion, r.contenido
                FROM rubricas r
                JOIN materias m ON m.id = r.materia_id
                WHERE LOWER(TRIM(r.nivel)) = LOWER(TRIM(${nivel}))
                ORDER BY r.id ASC
              `
            : await sql`
                SELECT m.nombre AS materia, r.evaluacion, r.contenido
                FROM rubricas r
                JOIN materias m ON m.id = r.materia_id
                ORDER BY r.id ASC
              `;

    const rubricas: Record<string, RubricasMateria> = {};

    for (const row of rows) {
      const mat = String(row.materia).trim();
      const ev = String(row.evaluacion).trim().toLowerCase() as keyof RubricasMateria;
      if (!rubricas[mat]) rubricas[mat] = {};
      rubricas[mat][ev] = String(row.contenido);
    }

    return NextResponse.json({ success: true, rubricas });
  } catch (error) {
    console.error('Error obteniendo rúbricas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar las rúbricas.', rubricas: {} },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { textoPreguntas, materiaNombreManual, anioManual, nivelManual } = body;

    if (!textoPreguntas || typeof textoPreguntas !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Debes pegar el contenido del documento.' },
        { status: 400 }
      );
    }

    const parsed = parsearExamenGoogleDoc(textoPreguntas);

    const materiaFinal = (parsed.materia || materiaNombreManual || '').trim();
    const anioFinal = parsed.anio || (anioManual ? Number(anioManual) : undefined);
    const nivelFinal = parsed.nivel || nivelManual;

    if (!materiaFinal) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se detectó "Área:" en el documento. Escribe el nombre de la materia manualmente.',
        },
        { status: 400 }
      );
    }

    if (!anioFinal || !nivelFinal) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se detectó "Gestión:" o "Hito de Evaluación:" en el documento.',
        },
        { status: 400 }
      );
    }

    // Buscar entre todas las materias existentes ignorando tildes, mayúsculas y espacios extra
    const todasMaterias = await sql`SELECT id, nombre FROM materias`;
    const encontrada = todasMaterias.find(
      (m) => normalizarNombreMateria(String(m.nombre)) === normalizarNombreMateria(materiaFinal)
    );

    let materiaId: number;
    let materiaDbNombre: string;

    if (encontrada) {
      materiaId = Number(encontrada.id);
      materiaDbNombre = String(encontrada.nombre);
    } else {
      const insertada = await sql`
        INSERT INTO materias (nombre)
        VALUES (${materiaFinal})
        RETURNING id, nombre
      `;
      materiaId = Number(insertada[0].id);
      materiaDbNombre = String(insertada[0].nombre);
    }

    const entradas = Object.entries(parsed.secciones).filter(
      ([, contenido]) => typeof contenido === 'string' && contenido.trim().length > 0
    );

    if (entradas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron preguntas válidas en el texto pegado.' },
        { status: 400 }
      );
    }

    for (const [evaluacion, contenido] of entradas) {
      await sql`
        INSERT INTO rubricas (materia_id, evaluacion, anio, nivel, contenido)
        VALUES (${materiaId}, ${evaluacion}, ${anioFinal}, ${nivelFinal}, ${contenido})
        ON CONFLICT (materia_id, evaluacion, anio, nivel)
        DO UPDATE SET contenido = EXCLUDED.contenido
      `;
    }

    return NextResponse.json({
      success: true,
      materia: materiaDbNombre,
      anio: anioFinal,
      nivel: nivelFinal,
      semestre: parsed.semestre ?? null,
      seccionesGuardadas: entradas.map(([k]) => k),
    });
  } catch (error) {
    console.error('Error guardando rúbricas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar el documento.' },
      { status: 500 }
    );
  }
}