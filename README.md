# Perfil Hito — Auditoría Académica

**[Ver demo en vivo](https://hito-perfil.vercel.app/)**

## Qué es

Plataforma de auditoría académica que transforma datos crudos de rendimiento estudiantil en inteligencia accionable. Ingiere información desde Google Sheets, la procesa mediante un pipeline de análisis estadístico y pedagógico, la persiste en una base de datos relacional y la expone a través de dashboards interactivos para tres perfiles de usuario: coordinación académica, docentes y estudiantes.

## Para qué sirve

- **Diagnóstico individual**: cada estudiante recibe un perfil con fortalezas, debilidades, proyecciones y plan de acción generados dinámicamente desde sus notas reales.
- **Análisis comparativo**: rankings, percentiles, distribución por rangos y comparación contra el promedio del curso.
- **Progresión longitudinal**: seguimiento de la evolución de cada estudiante a través de los hitos Inicial → Intermedio → Avanzado.
- **Auditoría institucional**: identificación temprana de estudiantes en riesgo, materias críticas y tendencias globales por promoción.

## Cómo funciona

El sistema opera en cuatro fases:

1. **Ingesta**: un endpoint recibe la URL del Google Sheet, extrae el identificador del documento y se autentica contra la API de Google Sheets mediante una cuenta de servicio. Itera cada pestaña (una por materia), parsea las filas y normaliza los datos a un esquema canónico `{estudiante, correo, P1, P2, P3, promedio}`.
2. **Procesamiento**: un motor de cálculo infiere la escala (0–20 o 0–100 según el máximo detectado), calcula estadísticas por materia (promedio, aprobados, regulares, en riesgo), construye perfiles individuales con análisis cualitativo generado a partir de los datos (mejor/peor materia, diferencia vs. curso, tendencia P1→P3, desviación entre materias) y genera proyecciones.
3. **Persistencia**: los resultados se almacenan en una base de datos PostgreSQL serverless (Neon) con un esquema relacional normalizado que separa estudiantes, materias y notas, incluyendo metadatos de año y nivel de hito para permitir consultas históricas.
4. **Presentación**: el frontend consume los datos desde endpoints que leen la base de datos, ofreciendo dashboards interactivos con visualizaciones SVG (gráficos de dona para distribución, gráficos de ondas secuenciales para progresión) y vistas segmentadas por materia, estudiante y comparativa.

## Arquitectura

El sistema sigue una arquitectura **cliente-servidor desacoplada** con las siguientes capas:

- **Capa de presentación**: aplicación Next.js 16 con App Router, componentes React 19, TypeScript estricto y Tailwind CSS. Renderizado híbrido (server components para estructura, client components para interactividad). Diseño responsive con sidebar desplegable y paleta académica funcional.
- **Capa de API**: endpoints REST implementados como Route Handlers de Next.js. Tres rutas principales: ingesta de datos (`POST /api/perfiles`), consulta histórica (`GET /api/historial`) y progresión longitudinal (`GET /api/progresion`). Cada endpoint valida entrada, maneja errores y devuelve JSON tipado.
- **Capa de dominio**: módulo de cálculo puro (sin dependencias de framework) que implementa la lógica estadística y pedagógica. Funciones puras, testeables y reutilizables tanto en backend como en frontend.
- **Capa de persistencia**: PostgreSQL serverless (Neon) con driver HTTP (`@neondatabase/serverless`). Esquema relacional con integridad referencial, índices por año/nivel y operaciones por lote para minimizar latencia.
- **Capa de integración externa**: cliente de Google Sheets API mediante `googleapis` con autenticación por cuenta de servicio y scope mínimo (`spreadsheets.readonly`).

**Patrones aplicados**: separación de responsabilidades por capas, stateless API, batch processing para operaciones de base de datos, type guards para validación en runtime, y renderizado progresivo con animaciones secuenciales.

## Stack técnico

| Componente | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Persistencia | Neon (PostgreSQL serverless) |
| Integración | Google Sheets API v4 |
| Autenticación | Service Account (Google Cloud) |
| Deployment | Vercel |
| Visualización | SVG nativo (sin librerías externas) |

## Modelo de datos

Esquema relacional normalizado en tercera forma normal:

- **`estudiantes`**: identidad única por nombre, correo opcional, timestamps.
- **`materias`**: catálogo de materias únicas.
- **`notas`**: tabla de hechos con clave foránea compuesta (`estudiante_id`, `materia_id`, `evaluacion`), valor numérico, año y nivel de hito. Índices por año y nivel para consultas históricas eficientes.

Las operaciones de escritura se realizan por lote mediante `unnest` para minimizar round-trips a la base de datos (de ~900 consultas individuales a ~6 consultas batch).

## Seguridad

- Credenciales gestionadas como variables de entorno en Vercel, nunca en el repositorio.
- `.gitignore` configurado para excluir claves, archivos `.env` y artefactos de build.
- Scope mínimo de Google API (`spreadsheets.readonly`).
- Conexiones a base de datos con SSL obligatorio (`sslmode=require`).
- Validación de tipos en runtime mediante type guards antes de procesar respuestas de API.

## Escalabilidad

- Arquitectura stateless: cada request es independiente, permitiendo escalado horizontal automático en Vercel.
- Base de datos serverless con connection pooling y facturación por uso.
- Procesamiento por lote para reducir latencia en operaciones masivas.
- Componentes de visualización sin dependencias externas (SVG nativo), minimizando el bundle size.
---

## Diagnóstico por hitos (rama `feature/perfil-diagnostico`)

Se suma a lo que ya tiene `main` (carga por Google Sheets, exámenes que se ordenan y guardan solos, historial, análisis y progresión):

- **Cargar datos → 1. Calificaciones por pregunta (Excel):** sube «Calificaciones por pregunta» y «Calificaciones por materia» del hito (Inicial, Intermedio o Final). No requiere base de datos.
- **Análisis → Resumen general:** tortas del curso (con opción de verlas como barras) y el listado general con el botón **Ver perfil**. El listado de cada materia (Dashboard) también tiene **Ver perfil**.
- **Análisis → Estudiante:** además del perfil de `main`, muestra el diagnóstico por pregunta: *Lo que domina*, *Lo que le cuesta* y *Cómo debe reforzar* (temas pendientes con lo que le falta y qué estudiar). Botón para descargar el reporte del estudiante en PDF.
- **Reportes:** reporte del curso e individual en PDF, y datos en Excel (CSV). Hay un PDF del curso sin nombres para presentar.
- **Progresión:** muestra el avance entre los hitos cargados desde Excel.

Pruebas: `npm test` (47 casos del motor de análisis).
