const test = require('node:test');
const assert = require('node:assert/strict');

const { clasificarErrorGoogle, urlExportacion } = require('../.pruebas/lib/google-errores.js');

test('detecta la API deshabilitada y extrae el enlace de habilitación', () => {
  const mensaje =
    'Google Sheets API has not been used in project 680458819925 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680458819925 then retry.';
  const diagnostico = clasificarErrorGoogle(mensaje);
  assert.equal(diagnostico.causa, 'api-deshabilitada');
  assert.equal(
    diagnostico.enlace,
    'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680458819925',
  );
  assert.equal(diagnostico.intentarExportacion, true);
  assert.match(diagnostico.instruccion, /Habilitar/i);
});

test('detecta la falta de permiso sobre el libro', () => {
  const diagnostico = clasificarErrorGoogle(
    'The caller does not have permission',
  );
  assert.equal(diagnostico.causa, 'sin-permiso');
  assert.match(diagnostico.instruccion, /cuenta de servicio|enlace/i);
});

test('detecta credenciales ausentes', () => {
  const diagnostico = clasificarErrorGoogle('ENOENT: no such file or directory, open keys.json');
  assert.equal(diagnostico.causa, 'credenciales');
  assert.equal(diagnostico.enlace, null);
});

test('detecta cuota agotada y errores desconocidos', () => {
  assert.equal(clasificarErrorGoogle('RESOURCE_EXHAUSTED: quota exceeded').causa, 'cuota');
  const otro = clasificarErrorGoogle('algo inesperado');
  assert.equal(otro.causa, 'desconocida');
  assert.equal(otro.intentarExportacion, true);
});

test('la URL de exportación apunta al archivo xlsx del libro', () => {
  assert.equal(
    urlExportacion('1AbC_-x'),
    'https://docs.google.com/spreadsheets/d/1AbC_-x/export?format=xlsx',
  );
});
