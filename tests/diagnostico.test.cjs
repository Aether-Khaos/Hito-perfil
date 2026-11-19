const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticarMateria, diagnosticarEstudiante, resumirCurso } = require('../.pruebas/lib/diagnostico.js');
const { buscarMateria } = require('../.pruebas/lib/catalogo-reactivos.js');

test('diagnostica Estructuras de Datos con 12/35 + 18/30 + 14/35', () => {
  const materia = buscarMateria('Estructura de datos');
  const diagnostico = diagnosticarMateria(
    { materia: 'Estructura de datos', puntos: { P1: 12, P2: 18, P3: 14 } },
    materia,
  );

  assert.equal(diagnostico.catalogada, true);
  assert.equal(diagnostico.pctGlobal, 44);
  assert.equal(diagnostico.nivelGlobal.etiqueta, 'Proceso');
  assert.equal(diagnostico.cobertura, 'dimension');
  assert.equal(diagnostico.dimensiones.length, 3);

  const p1 = diagnostico.dimensiones[0];
  assert.equal(p1.pct, Number(((12 / 35) * 100).toFixed(2)));
  assert.equal(p1.nivel.etiqueta, 'Proceso');

  // P2 (18/30 = 60 %) alcanza Logrado y no debe generar brecha.
  assert.ok(!diagnostico.brechas.some((b) => b.dimension === 'P2'));
  assert.ok(diagnostico.brechas.some((b) => b.dimension === 'P1'));
  assert.ok(diagnostico.brechas.some((b) => b.dimension === 'P3'));

  const primera = diagnostico.brechas[0];
  assert.equal(primera.puntosEnRiesgo, 23);
  assert.ok(primera.descripcion.includes('35'));
  assert.ok(primera.competencias.length > 0);
});

test('una dimensión sin nota se informa como falta de evidencia, no como cero', () => {
  const diagnostico = diagnosticarMateria(
    { materia: 'Ingles', puntos: { P1: 20, P2: null, P3: 25 } },
    buscarMateria('Ingles'),
  );
  assert.equal(diagnostico.promedio.completo, false);
  assert.equal(diagnostico.promedio.maximoDisponible, 60);
  const sinNota = diagnostico.brechas.find((b) => b.dimension === 'P2');
  assert.ok(sinNota);
  assert.equal(sinNota.dominioPct, null);
  assert.ok(sinNota.descripcion.includes('No hay calificación'));
});

test('el detalle por reactivo se usa cuando el libro lo trae', () => {
  const diagnostico = diagnosticarMateria(
    {
      materia: 'Fundamentos de Matematicas',
      puntos: { P1: 10, P2: 30, P3: 35 },
      reactivos: { 'MAT-1.1': 10, 'MAT-1.2': 0, 'MAT-1.3': 0 },
    },
    buscarMateria('Fundamentos de Matematicas'),
  );
  assert.equal(diagnostico.cobertura, 'reactivo');
  const reactivoFallado = diagnostico.brechas.find((b) => b.id === 'MAT-1.2');
  assert.ok(reactivoFallado);
  assert.equal(reactivoFallado.dominioPct, 0);
  assert.equal(reactivoFallado.puntosEnRiesgo, 20);
});

test('una asignatura no catalogada no inventa interpretación', () => {
  const diagnostico = diagnosticarMateria(
    { materia: 'Física', puntos: { P1: 10 } },
    null,
  );
  assert.equal(diagnostico.catalogada, false);
  assert.equal(diagnostico.brechas.length, 0);
  assert.ok(diagnostico.advertencias[0].includes('no está en el banco'));
});

test('el perfil del estudiante agrega brechas y redacta una narrativa', () => {
  const buscar = (nombre) => buscarMateria(nombre);
  const estudiante = diagnosticarEstudiante('ESTUDIANTE UNO', [
    { materia: 'Fundamentos de Matematicas', puntos: { P1: 0, P2: 0, P3: 0 } },
    { materia: 'Logica', puntos: { GLOBAL: 80 } },
    { materia: 'Ingles', puntos: { P1: 10, P2: 12, P3: 15 } },
  ], buscar);

  assert.equal(estudiante.materias.length, 3);
  assert.ok(estudiante.narrativa.includes('ESTUDIANTE UNO'));
  assert.ok(estudiante.narrativa.includes('apoyo descriptivo'));
  assert.ok(estudiante.fortalezas.length > 0, 'Lógica al 80 % debe registrarse como fortaleza');

  const primera = estudiante.brechas[0];
  assert.equal(primera.puntosEnRiesgo >= estudiante.brechas[1].puntosEnRiesgo, true);
});

test('resumirCurso agrega distribución y carencias frecuentes', () => {
  const buscar = (nombre) => buscarMateria(nombre);
  const estudiantes = ['A', 'B', 'C'].map((nombre, indice) =>
    diagnosticarEstudiante(nombre, [
      {
        materia: 'Fundamentos de Matematicas',
        puntos: { P1: 0, P2: 0, P3: 0 + indice * 10 },
      },
    ], buscar),
  );

  const resumen = resumirCurso(estudiantes);
  assert.equal(resumen.length, 1);
  assert.equal(resumen[0].estudiantes, 3);
  assert.equal(resumen[0].materia, 'Fundamentos de Matemáticas');
  assert.ok(resumen[0].pctLogradoOMas <= 100);
  assert.ok(resumen[0].carenciasFrecuentes.length >= 1);
  assert.equal(resumen[0].carenciasFrecuentes[0].estudiantes, 3);
});
