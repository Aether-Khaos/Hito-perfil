# Hito-Perfil — Perfil diagnóstico por hitos

Sistema de perfilado académico por hitos (Inicial → Intermedio → Final) de la Sociedad de
Investigación de Ingeniería de Sistemas, Universidad Adventista de Bolivia.

Lee los libros de calificaciones del hito, normaliza cada pregunta con su puntaje máximo y genera:

- **Reporte global** de la cohorte (PDF imprimible y CSV para Excel).
- **Perfil diagnóstico por estudiante**: preguntas no logradas, tipo de error, fortalezas y debilidades
  específicas, recomendaciones de estudio, cuartil y posición por asignatura (PDF y CSV).
- **Análisis por pregunta**: media, índice de dificultad (p), índice de discriminación (D), porcentaje
  no logrado y taxonomía de errores.
- **Progresión por hitos**: variación entre hitos, tendencia, cruce del umbral Logrado y brechas
  recuperadas o nuevas; mientras solo hay un hito, el progreso dentro del hito (P1 → P3).
- **Modo anónimo** (activado por defecto): códigos estables `E-XXX` en lugar de nombres, para proyectar
  o exportar sin datos personales.

> Rama `feature/perfil-diagnostico`. Basada en `feature/diagnostico-por-reactivos`.

## Ejecutar en local

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 47 pruebas del motor
```

1. Elige el hito (Inicial, Intermedio o Final).
2. Selecciona **«Calificaciones por pregunta…xlsx»** y, si lo tienes, **«Calificaciones por materia…xlsx»**
   (se usa para la validación cruzada y para Habilidades blandas). Puedes elegir los dos a la vez.
3. Pulsa **Analizar como Hito …**. Los datos quedan guardados en el navegador; repite con otro hito para
   activar la progresión.

No requiere base de datos ni credenciales. El enlace de Google Sheets es opcional: usa la cuenta de
servicio de `keys.json` (o `GOOGLE_CREDENTIALS_JSON`) y, si no existe, la exportación pública del libro.

## Flujo

```
Excel / Google Sheets ─▶ POST /api/perfiles (compacto)
                           lib/leer-xlsx.ts      libro .xlsx sin dependencias
                           lib/parser-libro.ts   encabezados, fila de máximos, vacíos vs. ceros
                           lib/consolidado.ts    libro «por materia» (validación cruzada)
                        ◀─ registros compactos por estudiante y asignatura
Navegador ─▶ lib/analisis-hitos.ts  (estadística, ítems, errores, perfil, comparación entre hitos)
          ─▶ lib/diagnostico.ts     (dominio por pregunta y competencias del catálogo)
          ─▶ localStorage por hito  ─▶ vistas, /reporte (PDF) y CSV
```

## Método de análisis

| Componente | Cálculo |
|---|---|
| Dominio | puntos obtenidos / máximo de la pregunta × 100; celda vacía = sin evidencia (se excluye), cero = calificación |
| Nivel | Escala UAB: Inicio 0–30, Proceso 31–50, Logrado 51–70, Destacado 71–89, Excepcional 90–100 |
| Cuartiles | Interpolación lineal (tipo 7, igual que `CUARTIL.INC` de Excel) |
| Dificultad p | Media del puntaje relativo de la pregunta (0–1) |
| Discriminación D | p del 27 % superior − p del 27 % inferior (por total de la asignatura) |
| Tipo de error | Banda de puntaje: conceptual < 31 %, procedimental 31–70 %, descuido 71–89 % (inferido) |
| Riesgo | Alto: global < 31 % o ≥ 3 asignaturas en Inicio. Medio: global < 51 % o 2 en Inicio |
| Progreso | Δ entre hitos (mejora > +2 pp, retroceso < −2 pp); P3 − P1 dentro del hito |

El tipo de error es una inferencia sobre el puntaje, no una lectura de la respuesta escrita. Cuando el
libro incluya columnas por ítem (`P1.1`, `MAT-1.2`), el motor calcula el dominio de cada competencia.

## Estructura

| Archivo | Rol |
|---|---|
| `lib/analisis-hitos.ts` | Estadística, análisis de ítems, taxonomía de errores, perfil, comparación entre hitos, CSV |
| `lib/diagnostico.ts`, `lib/catalogo-reactivos.ts` | Motor por competencias y banco de 54 reactivos |
| `lib/consolidado.ts` | Lector del libro «Calificaciones por materia» |
| `components/Vistas.tsx` | Resumen global, por asignatura, perfil (lista + panel lateral) y progresión |
| `components/PerfilDiagnostico.tsx` | Perfil individual (pantalla y PDF) |
| `components/graficos.tsx` | Gráficos SVG con tooltip, paleta validada para daltonismo |
| `app/reporte/page.tsx` | Reportes imprimibles global e individual |

## Datos personales

Los libros con nombres y correos no se versionan. El análisis se guarda solo en el navegador del equipo
que lo cargó. Para presentaciones, mantén el **modo anónimo** activo.
