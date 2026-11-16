const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NIVELES_UAB,
  nivelDeLogro,
  porcentaje,
  promedioPonderado,
  UMBRAL_LOGRADO,
} = require('../.pruebas/lib/escala.js');

test('nivelDeLogro respeta los cortes institucionales de la UAB', () => {
  assert.equal(nivelDeLogro(0).etiqueta, 'Inicio');
  assert.equal(nivelDeLogro(30).etiqueta, 'Inicio');
  assert.equal(nivelDeLogro(31).etiqueta, 'Proceso');
  assert.equal(nivelDeLogro(50).etiqueta, 'Proceso');
  assert.equal(nivelDeLogro(51).etiqueta, 'Logrado');
  assert.equal(nivelDeLogro(70).etiqueta, 'Logrado');
  assert.equal(nivelDeLogro(71).etiqueta, 'Destacado');
  assert.equal(nivelDeLogro(89).etiqueta, 'Destacado');
  assert.equal(nivelDeLogro(90).etiqueta, 'Excepcional');
  assert.equal(nivelDeLogro(100).etiqueta, 'Excepcional');
  assert.equal(NIVELES_UAB.length, 5);
});

test('nivelDeLogro acota valores fuera de rango', () => {
  assert.equal(nivelDeLogro(-10).etiqueta, 'Inicio');
  assert.equal(nivelDeLogro(180).etiqueta, 'Excepcional');
  assert.equal(nivelDeLogro(Number.NaN).etiqueta, 'Inicio');
});

test('porcentaje normaliza puntos sobre el máximo', () => {
  assert.equal(porcentaje(12, 35), (12 / 35) * 100);
  assert.equal(porcentaje(35, 35), 100);
  assert.equal(porcentaje(0, 30), 0);
  assert.equal(porcentaje(5, 0), 0);
  assert.equal(porcentaje(-4, 35), 0);
});

test('promedioPonderado usa Σ puntos / Σ máximos (caso 12+18+14 de 35/30/35)', () => {
  const resultado = promedioPonderado({ P1: 12, P2: 18, P3: 14 }, { P1: 35, P2: 30, P3: 35 });
  assert.equal(resultado.puntos, 44);
  assert.equal(resultado.maximoDisponible, 100);
  assert.equal(resultado.pct, 44);
  assert.equal(resultado.completo, true);
  assert.deepEqual(resultado.evaluacionesConsideradas, ['P1', 'P2', 'P3']);
});

test('promedioPonderado no convierte una ausencia en cero', () => {
  const completo = promedioPonderado({ P1: 30, P2: 30, P3: null }, { P1: 30, P2: 35, P3: 35 });
  assert.equal(completo.puntos, 60);
  assert.equal(completo.maximoDisponible, 65);
  assert.equal(completo.completo, false);
  assert.deepEqual(completo.evaluacionesAusentes, ['P3']);
  assert.ok(completo.pct > completo.pctSobreTotal);
  assert.equal(completo.pctSobreTotal, 60);
});

test('promedioPonderado acota notas superiores al máximo', () => {
  const resultado = promedioPonderado({ P1: 40, P2: 30, P3: 35 }, { P1: 35, P2: 30, P3: 35 });
  assert.equal(resultado.puntos, 100);
  assert.equal(resultado.pct, 100);
});

test('el umbral Logrado es 51 puntos porcentuales', () => {
  assert.equal(UMBRAL_LOGRADO, 51);
});
