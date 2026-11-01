# Perfil Hito — Auditoría Académica

Panel de análisis de rendimiento académico que lee un Google Sheet (una pestaña por materia) y genera dashboards, rankings y perfiles dinámicos por estudiante y por materia.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · googleapis

## Cómo funciona

POST /api/perfiles recibe { url } → extrae el spreadsheetId → autentica con keys.json → itera cada pestaña, parsea filas (Nombre, Correo, P1, P2, P3) → calcula estadísticas y perfiles → devuelve JSON. El cliente (app/page.tsx) orquesta estado y despacha a las vistas en components/.

- Materias = nombre de cada pestaña (ignora Resumen, Config, Índice, Portada, Readme, Ayuda).
- Escala autodetectada: máx ≤ 20 → escala 0-20, si no → 0-100. Umbrales: aprobado ≥ 70%, regular ≥ 50%.
- Identidad de estudiante: por nombre (el correo puede venir vacío).
- Análisis cualitativo se genera desde datos reales: mejor/peor materia, diff vs curso, tendencia P1→P3, desviación entre materias. Cada estudiante recibe textos distintos.

## Estructura

app/api/perfiles/route.ts   endpoint
app/page.tsx                orquestador de estado
lib/types.ts                tipos
lib/utils.ts                cálculos (distribución, percentil, análisis materia×estudiante)
components/                 vistas (dashboard/, profile/, ui)

## Setup

1. Google Cloud → habilitar Sheets API → crear Service Account → descargar clave JSON → renombrar a keys.json en la raíz.
2. Compartir el Sheet con el client_email de keys.json (permiso Lector).
3. Instalar y correr:

git clone <repo> && cd perfil-hito
npm install
cp /ruta/clave.json ./keys.json
npm run dev

http://localhost:3000 → pegar URL del Sheet → Cargar Enlace.

## Formato del Sheet

- Primera fila: headers. Debe haber columna con nombre/estudiante y opcionalmente correo/email. Si no se detectan, se usa N° / Nombre / Correo en índices 0, 1, 2.
- Las primeras 3 columnas numéricas después de la columna 2 se leen como P1, P2, P3.
- Una pestaña = una materia.

## Scripts

npm run dev      # desarrollo
npm run build    # build
npm start        # producción

## Troubleshooting

| Síntoma | Fix |
|---|---|
| 404 en /api/perfiles | Reiniciar npm run dev (Next no recompiló la ruta nueva) |
| 500 con error | keys.json inválido o Sheet sin compartir con el service account |
| Tablas vacías, stats cargan | Headers no matchean → renombrar o respetar orden de columnas |

## Notas

- Sin persistencia: cada carga reemplaza el estado; no hay caché ni DB.
- keys.json nunca se commitea — agregar a .gitignore.
- Scope mínimo necesario: spreadsheets.readonly.
