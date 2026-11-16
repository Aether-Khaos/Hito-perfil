const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { leerLibroXlsx } = require('../.pruebas/lib/leer-xlsx.js');
const { leerHoja } = require('../.pruebas/lib/parser-libro.js');

const RUTA = path.join(__dirname, 'fixtures', 'libro-minimo.xlsx');

test('leerLibroXlsx devuelve las hojas en orden con su encabezado', () => {
  const hojas = leerLibroXlsx(fs.readFileSync(RUTA));
  assert.equal(hojas.length, 3);
  assert.equal(hojas[0].titulo, 'Matematicas');
  assert.equal(hojas[1].titulo, 'Logica');
  assert.equal(hojas[2].titulo, 'Ingles');
  assert.deepEqual(hojas[0].filas[0].slice(0, 6), ['N°', 'Nombre', 'Correo', 'P1', 'P2', 'P3']);
});

test('leerLibroXlsx ubica las columnas aunque la primera esté vacía', () => {
  // Regresión: con `<c r="A1"/><c r="B1">…` el lector tomaba ambas como una sola
  // celda y corría toda la fila una posición a la izquierda.
  const hojas = leerLibroXlsx(fs.readFileSync(RUTA));
  const ingles = hojas[2];
  assert.deepEqual(ingles.filas[0].slice(0, 4), ['', 'Nombre', 'Correo', 'P1']);
  const leida = leerHoja(ingles.filas, { materia: 'Ingles' });
  assert.equal(leida.registros.length, 2);
  assert.equal(leida.registros[0].nombre, 'ANA TORRES');
  assert.equal(leida.registros[0].promedio, 70);
});

test('leerLibroXlsx conserva la fila de máximos y las filas con datos parciales', () => {
  const [matematicas] = leerLibroXlsx(fs.readFileSync(RUTA));
  assert.deepEqual(matematicas.filas[1], ['', 'notas', '', '35', '30', '35']);
  // La quinta fila solo trae nombre y correo: el lector la conserva y `leerHoja` la descarta.
  assert.equal(matematicas.filas.length, 5);
  assert.deepEqual(matematicas.filas[4], ['3', 'SIN NOTAS', 'sin@uab.edu.bo']);
});

test('el lector de hojas interpreta un .xlsx igual que la respuesta de Google Sheets', () => {
  const hojas = leerLibroXlsx(fs.readFileSync(RUTA));
  const matematicas = leerHoja(hojas[0].filas, { materia: 'Matematicas' });
  assert.equal(matematicas.registros.length, 2);
  assert.deepEqual(matematicas.maxima, { P1: 35, P2: 30, P3: 35 });
  assert.equal(matematicas.registros[0].nombre, 'ANA TORRES');
  assert.equal(matematicas.registros[0].promedio, 44);
  assert.equal(matematicas.registros[1].promedio, 35);

  const logica = leerHoja(hojas[1].filas, { materia: 'Logica' });
  assert.deepEqual(logica.maxima, { GLOBAL: 100 });
  assert.equal(logica.registros[0].promedio, 70);
});

test('leerLibroXlsx rechaza un archivo que no es un libro', () => {
  assert.throws(() => leerLibroXlsx(Buffer.from('esto no es un xlsx')), /\.xlsx válido|hojas legibles/);
});
