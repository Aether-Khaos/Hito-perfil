# Entregables

Documentos generados para la entrega del Trabajo Final de **Auditoría y Seguridad de Sistemas**
(UAB, Ingeniería de Sistemas, noviembre de 2026). Ambos se construyen a partir de las mismas
cifras verificadas sobre el libro de calificaciones del Hito Inicial 2026.

| Archivo | Qué es | Formato |
|---|---|---|
| `Informe_Auditoria_Hito_Perfil.docx` | Informe de auditoría del sistema Perfil Hito, con la estructura del instructivo de la carrera: objetivo, alcance, periodo, criterios, compromisos, resumen ejecutivo, diez hallazgos con condición/criterio/causa/efecto/recomendación, mejoras implementadas, resultados, verificación técnica, limitaciones, conclusiones, plan de acción y anexos. | 26 páginas, Calibri 11, tablas numeradas, 4 figuras |
| `Articulo_Perfil_Hito_v2.docx` | Artículo académico en formato APA 7: título bilingüe, resumen y abstract, introducción, marco de referencia, método, resultados, discusión, limitaciones, conclusiones, declaraciones, referencias con sangría francesa y anexo. | 21 páginas, Times New Roman 12 a doble espacio, 7 tablas, 3 figuras |
| `figuras/` | Figuras en PNG a 200 ppp usadas en ambos documentos. | 4 archivos |

## Cifras que comparten los dos documentos

Recalculadas de forma independiente (Python 3.12, pandas, numpy) y verificadas con el motor
implementado en el repositorio:

- Dominio medio por asignatura: Matemáticas 11,6 %; Programación 43,4 %; Estructuras de Datos 44,4 %;
  Inglés 46,0 %; Lógica 71,1 %.
- 56 estudiantes con al menos una evaluación calificada; 274 calificaciones con valor.
- Distribución global: 16 en Inicio, 21 en Proceso, 14 en Logrado, 5 en Destacado.
- Medias del libro consolidado (60 registros): 11,02; 38,90; 39,20; 43,73; 69,15.

## Cómo se regeneran

Los generadores viven en `_work/` (carpeta local, no versionada): `graficos.py`,
`informe_docx.py`, `articulo_docx.py` y el módulo de estilo `docx_comun.py`.
