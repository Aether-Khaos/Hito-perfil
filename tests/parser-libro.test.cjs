const test = require('node:test');
const assert = require('node:assert/strict');

const { leerHoja, aNumero, mapearEncabezado, interpretarColumna } = require('../.pruebas/lib/parser-libro.js');
const { buscarMateria } = require('../.pruebas/lib/catalogo-reactivos.js');

const MATEMATICAS = [
  ['N°', 'Nombre', 'Correo', 'P1', 'P2', 'P3'],
  [null, 'notas', null, 35, 30, 35],
  [1, 'ESTUDIANTE UNO', 'uno@uab.edu.bo', 12, 18, 14],
  [2, 'ESTUDIANTE DOS', 'dos@uab.edu.bo', 20, 15, 25],
  [3, 'ESTUDIANTE TRES', 'tres@uab.edu.bo', null, null, null],
];

test('aNumero distingue vacío de cero y acepta coma decimal', () => {
  assert.equal(aNumero(''), null);
  assert.equal(aNumero(null), null);
  assert.equal(aNumero(undefined), null);
  assert.equal(aNumero(0), 0);
  assert.equal(aNumero('0'), 0);
  assert.equal(aNumero('12,5'), 12.5);
  assert.equal(aNumero('15 pts'), 15);
  assert.equal(aNumero('sin nota'), null);
});

test('interpretarColumna reconoce dimensiones, secciones y reactivos', () => {
  const materia = buscarMateria('Fundamentos de Matematicas');
  assert.deepEqual(interpretarColumna('P1', materia), { tipo: 'dimension', id: 'P1' });
  assert.deepEqual(interpretarColumna('p3 ', materia), { tipo: 'dimension', id: 'P3' });
  assert.deepEqual(interpretarColumna('Sección ', materia), { tipo: 'dimension', id: 'GLOBAL' });
  assert.deepEqual(interpretarColumna('P1.2', materia), {
    tipo: 'reactivo',
    id: 'MAT-1.2',
    dimension: 'P1',
  });
  assert.equal(interpretarColumna('Observaciones', materia), null);
});

test('mapearEncabezado encuentra nombre, correo y tres dimensiones', () => {
  const encabezado = mapearEncabezado(MATEMATICAS[0], buscarMateria('Fundamentos de Matematicas'));
  assert.equal(encabezado.indiceNombre, 1);
  assert.equal(encabezado.indiceCorreo, 2);
  assert.deepEqual(encabezado.dimensiones, { P1: 3, P2: 4, P3: 5 });
});

test('leerHoja ignora la fila de máximos y calcula el ponderado', () => {
  const hoja = leerHoja(MATEMATICAS, { materia: 'Fundamentos de Matematicas' });
  assert.equal(hoja.registros.length, 2);
  assert.deepEqual(hoja.maxima, { P1: 35, P2: 30, P3: 35 });
  assert.equal(hoja.filaMaximos, 1);

  const uno = hoja.registros[0];
  assert.equal(uno.nombre, 'ESTUDIANTE UNO');
  assert.equal(uno.promedio, 44);
  assert.equal(uno.completo, true);

  const dos = hoja.registros[1];
  assert.equal(dos.promedio, 60);
});

test('leerHoja excluye a quien no tiene ninguna nota y avisa del vacío', () => {
  const hoja = leerHoja(MATEMATICAS, { materia: 'Fundamentos de Matematicas' });
  assert.ok(!hoja.registros.some((r) => r.nombre === 'ESTUDIANTE TRES'));
});

test('leerHoja no confunde un cero declarado con una ausencia', () => {
  const filas = [
    ['Nombre', 'Correo', 'P1', 'P2', 'P3'],
    [null, 'notas', 35, 30, 35],
    ['ALUMNO CERO', 'c@x.bo', 0, 0, 0],
    ['ALUMNO MIXTO', 'm@x.bo', 0, null, 35],
  ];
  const hoja = leerHoja(filas, { materia: 'Fundamentos de Matematicas' });
  const cero = hoja.registros.find((r) => r.nombre === 'ALUMNO CERO');
  const mixto = hoja.registros.find((r) => r.nombre === 'ALUMNO MIXTO');
  assert.equal(cero.promedio, 0);
  assert.equal(cero.completo, true);
  assert.equal(mixto.completo, false);
  // 0/35 + 35/35 sobre los 70 puntos disponibles = 50 %.
  assert.equal(mixto.promedio, 50);
  assert.deepEqual(mixto.evaluacionesAusentes, ['P2']);
});

test('leerHoja admite la columna única "Sección" de Lógica', () => {
  const filas = [
    ['N°', 'Nombre', 'Correo', 'Seccion '],
    [null, 'notas', null, 100],
    [1, 'ANA', 'ana@x.bo', 70],
    [2, 'LUIS', 'luis@x.bo', 30],
  ];
  const hoja = leerHoja(filas, { materia: 'Logica' });
  assert.equal(hoja.registros.length, 2);
  assert.deepEqual(hoja.maxima, { GLOBAL: 100 });
  assert.equal(hoja.registros[0].promedio, 70);
});

test('leerHoja advierte notas por encima del máximo', () => {
  const filas = [
    ['Nombre', 'Correo', 'P1', 'P2', 'P3'],
    [null, 'notas', 35, 30, 35],
    ['EXCEDIDO', 'e@x.bo', 50, 30, 35],
  ];
  const hoja = leerHoja(filas, { materia: 'Fundamentos de Matematicas' });
  assert.ok(hoja.advertencias.some((a) => a.includes('supera el máximo')));
});

test('leerHoja advierte nombres repetidos (homónimos)', () => {
  const filas = [
    ['Nombre', 'Correo', 'P1', 'P2', 'P3'],
    [null, 'notas', 35, 30, 35],
    ['JUAN PEREZ', 'j1@x.bo', 10, 10, 10],
    ['JUAN PEREZ', 'j2@x.bo', 20, 20, 20],
  ];
  const hoja = leerHoja(filas, { materia: 'Fundamentos de Matematicas' });
  assert.equal(hoja.registros.length, 2);
  assert.ok(hoja.advertencias.some((a) => a.includes('más de una vez')));
});

test('leerHoja omite una hoja sin encabezados utilizables', () => {
  const filas = [
    ['N°', 'Nombre', 'Correo', 'Observaciones'],
    [1, 'ANA', 'ana@x.bo', 'sin notas'],
  ];
  const hoja = leerHoja(filas, { materia: 'Hoja rara' });
  assert.equal(hoja.registros.length, 0);
  assert.ok(hoja.advertencias[0].includes('encabezados'));
});

test('leerHoja usa los máximos del catálogo cuando el libro no los declara', () => {
  const filas = [
    ['Nombre', 'Correo', 'P1', 'P2', 'P3'],
    ['ANA', 'ana@x.bo', 10, 10, 10],
  ];
  const hoja = leerHoja(filas, { materia: 'Introduccion a la programación' });
  assert.deepEqual(hoja.maxima, { P1: 30, P2: 35, P3: 35 });
  assert.equal(hoja.registros[0].promedio, Number(((30 / 100) * 100).toFixed(2)));
});
