# Perfil Hito — Auditoría Académica

Aplicación web que lee un libro de Google Sheets (una pestaña por asignatura), normaliza las
calificaciones P1, P2 y P3 con los **máximos de cada instrumento** y presenta dashboards, rankings,
perfiles por estudiante y un **diagnóstico por competencias** que indica qué habilidades no evidencia
cada estudiante y qué conviene reforzar.

> Versión 2.0 · rama `feature/diagnostico-por-reactivos` · base: commit `d5d9b8f`.
> La auditoría completa, sus hallazgos y las cifras verificadas están en `entregables/`.

## Qué resuelve

El sistema anterior promediaba puntos brutos (35 + 30 + 35 → media simple) e infería la escala del
máximo observado, de modo que un estudiante con 35/35, 0/30 y 0/35 obtenía 11,7 puntos en lugar de los
35 que registra la libreta oficial. Esta versión:

1. Lee la fila de máximos que el docente escribe bajo el encabezado (`notas`, `puntaje`, `puntos`).
2. Calcula **Σ puntos / Σ máximos × 100**, excluyendo del numerador y del denominador las evaluaciones
   sin nota (una ausencia no es un cero).
3. Clasifica con la **escala institucional de la UAB**: Inicio 0–30, Proceso 31–50, Logrado 51–70,
   Destacado 71–89, Excepcional 90–100.
4. Traduce cada evaluación en las **competencias que el instrumento declara** y genera, por estudiante,
   la lista de competencias sin evidencia de logro con su acción de refuerzo.

## Cómo funciona

```
POST /api/perfiles  →  google sheets (spreadsheets.readonly)
                    →  lib/parser-libro.ts   (encabezado, máximos, vacíos vs ceros)
                    →  lib/escala.ts         (porcentaje, promedio ponderado, nivel)
                    →  lib/diagnostico.ts    (dominio por dimensión, brechas, narrativa)
                    →  JSON: datos + estadísticas + diagnósticos + advertencias
```

El cliente (`app/page.tsx`) guarda el resultado y la vista `/diagnostico` lo presenta sin volver a
consultar el libro. La ruta `POST /api/diagnostico` expone el mismo motor de forma independiente, para
integrarlo en otros sistemas.

## Módulo de diagnóstico por competencias

| Pieza | Archivo | Qué hace |
|---|---|---|
| Banco de reactivos | `lib/catalogo-reactivos.ts` | 5 asignaturas, 13 dimensiones, 54 reactivos con puntaje, unidad, evidencia esperada, carencia y acción |
| Escala y promedios | `lib/escala.ts` | Porcentaje, promedio ponderado, niveles institucionales, umbrales |
| Motor | `lib/diagnostico.ts` | Dominio por dimensión, brechas priorizadas por puntos en riesgo, resumen de curso, narrativa |
| Lector del libro | `lib/parser-libro.ts` | Encabezados, fila de máximos, columnas por ítem, detección de homónimos y notas fuera de rango |
| Interfaz | `app/diagnostico/page.tsx` + `components/diagnostico/` | Resumen por asignatura, competencias con menor evidencia y perfil individual |

**Regla de honestidad metodológica.** Si el libro solo trae nota por ejercicio, el motor informa el
dominio del ejercicio y enumera las competencias que ese ejercicio evalúa, marcándolas como «no
verificable individualmente»; no reparte el puntaje entre reactivos. Si el libro incorpora columnas por
ítem (`P1.1`, `P1.2` o el identificador del reactivo, por ejemplo `MAT-1.2`), calcula el dominio de cada
competencia por separado.

### Banco disponible (Hito Inicial 2026)

| Asignatura | Máximos | Dimensiones | Reactivos |
|---|---|---|---|
| Fundamentos de Matemáticas | 35 / 30 / 35 | 3 | 9 |
| Introducción a la Programación | 30 / 35 / 35 | 3 | 8 |
| Estructuras de Datos | 35 / 30 / 35 | 3 | 8 |
| Inglés | 30 / 40 / 30 | 3 | 19 |
| Lógica | 100 | 1 | 10 |

## API

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| `POST` | `/api/perfiles` | `{ url, anio?, nivel? }` | `datosMaterias`, `estadisticasMaterias`, `maximosPorMateria`, `perfilesEstudiantes`, `diagnosticos`, `resumenCurso`, `advertencias` |
| `POST` | `/api/diagnostico` | `{ filas: [{ materia, nombre, correo?, puntos, reactivos? }] }` | `estudiantes`, `resumenCurso`, `descartadas` |
| `GET` | `/api/diagnostico` | — | Descripción del servicio y banco de reactivos |

## Pruebas y verificación

```bash
npm test        # compila los módulos puros y ejecuta 29 pruebas
npx eslint .    # 0 errores
npx tsc --noEmit
npx next build
```

Las pruebas cubren los límites de la escala, el promedio ponderado, el tratamiento de vacíos frente a
ceros, la lectura de la fila de máximos, la advertencia por notas que exceden el máximo y por nombres
repetidos, la suma de puntos del banco de reactivos y la generación de brechas del motor.

## Instalación

```bash
npm install
cp /ruta/clave.json ./keys.json      # o definir GOOGLE_CREDENTIALS_JSON
npm run dev                          # http://localhost:3000
```

1. Habilitar Google Sheets API en Google Cloud y crear una cuenta de servicio.
2. Compartir el libro con el `client_email` de la cuenta (permiso Lector).
3. Pegar el enlace del libro en el panel principal.

Alcance solicitado a Google: `https://www.googleapis.com/auth/spreadsheets.readonly`.

## Formato esperado del libro

| N° | Nombre | Correo | P1 | P2 | P3 |
|---|---|---|---|---|---|
| — | notas | — | 35 | 30 | 35 |
| 1 | APELLIDO Nombre | correo@uab.edu.bo | 12 | 18 | 14 |
| 2 | APELLIDO Nombre | correo@uab.edu.bo | 20 | 15 | *(vacío)* |

- Una pestaña = una asignatura. Se omiten `Resumen`, `Config`, `Índice`, `Portada`, `Readme`, `Ayuda`,
  `Rubric`, `Students`, `Teachers`, `Radar` y las copias (`Copy of…`).
- La celda vacía es ausencia de evidencia; el `0` es calificación obtenida.
- Las asignaturas con una sola columna de evaluación se reconocen con encabezados como `Sección`.

## Estructura

```
app/
  api/perfiles/route.ts        ingesta + diagnóstico
  api/diagnostico/route.ts     motor como servicio
  diagnostico/page.tsx         vista de competencias
  page.tsx                     panel principal
components/
  diagnostico/                 perfil de competencias
  dashboard/ profile/          dashboards y perfiles
lib/
  catalogo-reactivos.ts  escala.ts  diagnostico.ts  parser-libro.ts  texto.ts
  types.ts  utils.ts
tests/                         29 pruebas (node:test sobre la salida de tsc)
entregables/                   informe de auditoría, artículo y figuras
```

## Limitaciones conocidas

- **Sin persistencia**: cada análisis vive en memoria del navegador; no hay historial entre hitos.
- **Sin autenticación**: cualquier persona con el enlace puede cargar un libro y ver los datos. No
  desplegar en Internet sin resolver este punto.
- **Identidad por nombre**: dos homónimos se fusionarían; el lector advierte los nombres repetidos, pero
  la solución definitiva requiere el código de estudiante en el libro.
- **Diagnóstico por ejercicio**: el libro del Hito Inicial no registra el puntaje por pregunta; el
  detalle por competencia se habilitará cuando el libro incluya columnas por ítem.
- **Una sola cuenta de servicio**: `keys.json` o `GOOGLE_CREDENTIALS_JSON`, sin rotación automática.

## Documentación de la auditoría

- `entregables/Informe_Auditoria_Hito_Perfil.docx` — informe de auditoría (10 hallazgos, mejoras,
  resultados y plan de acción).
- `entregables/Articulo_Perfil_Hito_v2.docx` — artículo académico en APA 7.
- `entregables/LEEME.md` — índice de entregables y criterios de las cifras.

## Créditos

Alex Rosales Quispe y Eva Lizeth Chino Quispe. Universidad Adventista de Bolivia, Ingeniería de
Sistemas, 2026.
