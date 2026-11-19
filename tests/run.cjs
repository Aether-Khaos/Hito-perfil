/**
 * Ejecutor de pruebas.
 *
 * `node --test tests/` requiere lanzar un proceso por archivo y algunos entornos
 * restringidos bloquean ese spawn. Este archivo carga todas las pruebas en un
 * único proceso y devuelve el código de salida correcto.
 */
require('./escala.test.cjs');
require('./catalogo.test.cjs');
require('./parser-libro.test.cjs');
require('./diagnostico.test.cjs');
require('./leer-xlsx.test.cjs');
require('./google-errores.test.cjs');
require('./analisis-hitos.test.cjs');
