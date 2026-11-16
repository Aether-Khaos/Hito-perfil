const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CATALOGO_REACTIVOS,
  buscarMateria,
  maximosDe,
  totalInstrumento,
} = require('../.pruebas/lib/catalogo-reactivos.js');

test('cada asignatura suma exactamente 100 puntos', () => {
  for (const materia of CATALOGO_REACTIVOS) {
    assert.equal(totalInstrumento(materia), 100, `${materia.nombre} no suma 100`);
    const maximos = maximosDe(materia);
    const suma = Object.values(maximos).reduce((a, b) => a + b, 0);
    assert.equal(suma, 100, `${materia.nombre}: los máximos por dimensión no suman 100`);
  }
});

test('la suma de reactivos coincide con el máximo de su dimensión', () => {
  for (const materia of CATALOGO_REACTIVOS) {
    for (const dimension of materia.dimensiones) {
      const suma = dimension.reactivos.reduce((a, reactivo) => a + reactivo.puntos, 0);
      assert.equal(
        suma,
        dimension.max,
        `${materia.nombre} / ${dimension.id}: reactivos suman ${suma}, máximo ${dimension.max}`,
      );
    }
  }
});

test('los identificadores de reactivo son únicos', () => {
  const vistos = new Set();
  for (const materia of CATALOGO_REACTIVOS) {
    for (const dimension of materia.dimensiones) {
      for (const reactivo of dimension.reactivos) {
        assert.ok(!vistos.has(reactivo.id), `id duplicado: ${reactivo.id}`);
        vistos.add(reactivo.id);
      }
    }
  }
});

test('buscarMateria tolera acentos, mayúsculas y plurales', () => {
  assert.equal(buscarMateria('Fundamentos de Matematicas').nombre, 'Fundamentos de Matemáticas');
  assert.equal(buscarMateria('Introduccion a la programación').nombre, 'Introducción a la Programación');
  assert.equal(buscarMateria('Estructura de datos').nombre, 'Estructuras de Datos');
  assert.equal(buscarMateria('Estructuras de datos').nombre, 'Estructuras de Datos');
  assert.equal(buscarMateria('Ingles').nombre, 'Inglés');
  assert.equal(buscarMateria('Logica').nombre, 'Lógica');
  assert.equal(buscarMateria('Materia inexistente'), null);
});

test('los máximos declarados coinciden con los instrumentos del hito', () => {
  assert.deepEqual(maximosDe(buscarMateria('Fundamentos de Matematicas')), { P1: 35, P2: 30, P3: 35 });
  assert.deepEqual(maximosDe(buscarMateria('Introduccion a la programación')), { P1: 30, P2: 35, P3: 35 });
  assert.deepEqual(maximosDe(buscarMateria('Estructura de datos')), { P1: 35, P2: 30, P3: 35 });
  assert.deepEqual(maximosDe(buscarMateria('Ingles')), { P1: 30, P2: 40, P3: 30 });
  assert.deepEqual(maximosDe(buscarMateria('Logica')), { GLOBAL: 100 });
});
