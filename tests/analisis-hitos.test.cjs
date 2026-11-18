const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../.pruebas/lib/analisis-hitos.js');
const { leerConsolidado } = require('../.pruebas/lib/consolidado.js');

const reg = (nombre, materia, puntos) => ({ nombre, correo: '', materia, puntos });
const cohorte = (hito, extra = 0) => ({
  hito,
  archivos: ['prueba.xlsx'],
  cargadoEn: '2026-06-01',
  consolidado: [],
  advertencias: [],
  registros: [
    reg('ALFA Uno', 'Estructuras de Datos', { P1: 35, P2: 30, P3: 35 }),
    reg('BETA Dos', 'Estructuras de Datos', { P1: 10, P2: 30, P3: 0 }),
    reg('GAMA Tres', 'Estructuras de Datos', { P1: 0 + extra, P2: 0 + extra, P3: 0 + extra }),
    reg('DELTA Cuatro', 'Estructuras de Datos', { P1: 20, P2: 20, P3: 30 }),
  ],
});

test('cuantiles tipo 7 coinciden con CUARTIL.INC de Excel', () => {
  const e = A.estadisticos([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(e.q1, 2.75);
  assert.equal(e.mediana, 4.5);
  assert.equal(e.q3, 6.25);
  assert.equal(A.cuartilDe(8, e), 4);
  assert.equal(A.cuartilDe(1, e), 1);
});

test('taxonomía de errores por banda de puntaje', () => {
  assert.deepEqual(A.clasificarPregunta(0), { estado: 'no_lograda', tipoError: 'conceptual' });
  assert.deepEqual(A.clasificarPregunta(45), { estado: 'no_lograda', tipoError: 'procedimental' });
  assert.deepEqual(A.clasificarPregunta(60), { estado: 'con_perdidas', tipoError: 'procedimental' });
  assert.deepEqual(A.clasificarPregunta(80), { estado: 'con_perdidas', tipoError: 'descuido' });
  assert.deepEqual(A.clasificarPregunta(100), { estado: 'correcta', tipoError: null });
  assert.deepEqual(A.clasificarPregunta(null), { estado: 'sin_nota', tipoError: null });
});

test('perfil diagnóstico identifica preguntas no logradas y recomienda acciones específicas', () => {
  const a = A.analizarHito(cohorte('Inicial'));
  const beta = a.estudiantes.find((e) => e.nombre === 'BETA Dos');
  const ed = beta.materias[0];
  assert.deepEqual(ed.preguntasNoLogradas, ['P1', 'P3']);
  assert.equal(ed.preguntas.find((p) => p.id === 'P3').tipoError, 'conceptual');
  assert.ok(beta.fortalezas.some((f) => f.includes('Polimorfismo')));
  assert.ok(beta.debilidades[0].includes('Herencia'));
  assert.ok(beta.recomendaciones.length > 0);
  assert.equal(beta.recomendaciones[0].prioridad, 'alta');
});

test('análisis de ítems: dificultad y discriminación por pregunta', () => {
  const a = A.analizarHito(cohorte('Inicial'));
  const p2 = a.materias[0].preguntas.find((p) => p.id === 'P2');
  assert.ok(p2.dificultad > 0 && p2.dificultad <= 1);
  assert.ok(p2.discriminacion !== null);
});

test('códigos anónimos estables y únicos', () => {
  const a = A.analizarHito(cohorte('Inicial'));
  const b = A.analizarHito(cohorte('Inicial'));
  assert.equal(a.estudiantes[0].codigo, b.estudiantes[0].codigo);
  assert.equal(new Set(a.estudiantes.map((e) => e.codigo)).size, a.estudiantes.length);
  assert.match(a.estudiantes[0].codigo, /^E-[0-9A-Z]{3}/);
});

test('comparación entre hitos calcula delta, tendencia y brechas recuperadas', () => {
  const ini = A.analizarHito(cohorte('Inicial'));
  const inter = A.analizarHito(cohorte('Intermedio', 25));
  const c = A.compararHitos([inter, ini]);
  assert.deepEqual(c.hitos, ['Inicial', 'Intermedio']);
  const gama = c.estudiantes.find((e) => e.nombre === 'GAMA Tres');
  assert.equal(gama.tendencia, 'mejora');
  assert.equal(gama.cruzaUmbral, true);
  assert.ok(gama.brechasRecuperadas.length >= 2);
  assert.equal(A.compararHitos([ini]), null);
});

test('CSV global anónimo no contiene nombres ni correos', () => {
  const a = A.analizarHito(cohorte('Inicial'));
  const csv = A.csvGlobal(a, true);
  assert.ok(!csv.includes('ALFA'));
  assert.ok(csv.startsWith('﻿Código;'));
});

test('lee el consolidado por materia y omite columnas de resultados', () => {
  const filas = [
    ['N°', 'Nombre', 'Correo', 'Fundamentos de matematicas', 'Resultados Matematicas', 'Inglés', 'Logica', 'Habilidades blandas', 'Promedio (sobre 100 puntos)'],
    [1, 'ALFA Uno', 'a@uab.edu.bo', 20, 'INICIO', 32, 70, 77.5, 44],
  ];
  const r = leerConsolidado(filas);
  assert.equal(r.length, 1);
  assert.deepEqual(Object.keys(r[0].valores).sort(), ['Fundamentos de Matemáticas', 'Habilidades blandas', 'Inglés', 'Lógica']);
  assert.equal(leerConsolidado([['Nombre', 'P1', 'P2'], ['x', 1, 2]]), null);
});
