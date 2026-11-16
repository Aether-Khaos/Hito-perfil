# Entregables

Documentos del proyecto de investigación **Evaluación del perfil de egreso por hitos** (UAB,
Ingeniería de Sistemas, gestión 2026). Todos se construyen con las mismas cifras verificadas sobre el
libro del Hito Inicial.

| Archivo | Qué es | Formato |
|---|---|---|
| `Informe_Investigacion_Hito_Perfil.docx` | Informe de investigación: planteamiento del problema, objetivos e hipótesis, justificación, marco de referencia, diseño metodológico, el sistema como instrumento, resultados, discusión, diseño de progresión hacia los hitos Intermedio y Final, limitaciones, conclusiones, recomendaciones y anexos. | 20 páginas · 14 tablas · 5 figuras |
| `Articulo_Progresion_Hitos_v3.docx` | Artículo en APA 7: título bilingüe, resumen y abstract, introducción, marco de referencia, método, resultados, discusión, limitaciones y trabajo futuro, conclusiones, declaraciones, referencias y anexo. | 20 páginas · 8 tablas · 3 figuras |
| `Analisis_por_estudiante_Hito_Inicial.xlsx` | Libro de trabajo con los 56 estudiantes: resumen, hoja por asignatura, hoja de carencias y hoja de método. **Contiene datos personales: uso interno.** | 8 hojas |
| `demo_diagnostico.html` | Vista previa estática del diagnóstico por competencias (datos anonimizados). Se abre sin servidor. | HTML |
| `figuras/` | Figuras en PNG a 200 ppp usadas en los documentos. | 5 archivos |
| `Articulo_Perfil_Hito_v2.docx` | **Versión anterior (auditoría).** Se conserva solo como respaldo; no usar en la entrega. | 21 páginas |

## Cifras que comparten los documentos

Recalculadas de forma independiente (Python 3.12, pandas, numpy) y verificadas con el motor del
repositorio:

- Dominio medio por asignatura: Matemáticas 11,6 %; Programación 43,4 %; Estructuras de Datos 44,4 %;
  Inglés 46,0 %; Lógica 71,1 %.
- 56 estudiantes con al menos una evaluación calificada; 274 calificaciones con valor.
- Distribución global: 16 en Inicio, 21 en Proceso, 14 en Logrado, 5 en Destacado.
- Progreso dentro del hito (P1→P3): 28 mejoran, 23 retroceden, 5 estables; variación media +2,43 puntos.
- Medias del libro consolidado (60 registros): 11,02; 38,90; 39,20; 43,73; 69,15.

## Cómo se regeneran

Los generadores viven en `_work/` (carpeta local, no versionada): `informe_investigacion.py`,
`articulo_progresion.py`, `excel_estudiantes.py`, `graficos.py`, `grafico_progreso.py` y el módulo de
estilo `docx_comun.py`.
