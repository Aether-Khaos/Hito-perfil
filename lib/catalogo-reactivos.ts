/**
 * Banco de reactivos del Hito Inicial 2026.
 *
 * Cada asignatura se descompone en las dimensiones que el libro de calificaciones
 * registra (P1, P2, P3 o una única columna global) y cada dimensión se descompone
 * en los reactivos que el instrumento de evaluación declara, con su puntaje.
 *
 * Fuente primaria: los cinco instrumentos de evaluación del Hito Inicial 2026 de
 * Ingeniería de Sistemas (UAB) —hoja de examen y rúbrica de cada asignatura—.
 * La suma de reactivos de una dimensión debe coincidir con su máximo, y la suma
 * de máximos con 100 puntos.
 *
 * Este catálogo es la pieza que permite pasar de «el estudiante sacó 0 en P1» a
 * «no hay evidencia de que resuelva la restricción de dominio de un logaritmo».
 */

import { claveMateria } from './texto';

export type DimensionId = 'P1' | 'P2' | 'P3' | 'GLOBAL';

export interface Reactivo {
  /** Identificador estable, usado como clave de la evaluación cuando hay nota por ítem. */
  id: string;
  nombre: string;
  /** Puntos que aporta al instrumento. */
  puntos: number;
  /** Unidad o bloque temático del programa de la asignatura. */
  unidad: string;
  /** Qué debe evidenciar el estudiante para obtener el puntaje. */
  evidencia: string;
  /** Descripción del desempeño cuando el puntaje es insuficiente. */
  carencia: string;
  /** Acción de refuerzo sugerida. */
  accion: string;
}

export interface Dimension {
  id: DimensionId;
  etiqueta: string;
  /** Título del ejercicio o sección en el instrumento. */
  consigna: string;
  /** Puntaje máximo de la dimensión. */
  max: number;
  reactivos: Reactivo[];
}

export interface MateriaCatalogo {
  /** Clave normalizada de la asignatura. */
  clave: string;
  nombre: string;
  /** Variantes observadas en libros y bases de datos. */
  alias: string[];
  hito: string;
  gestion: string;
  instrumento: string;
  duracionMin: number;
  dimensiones: Dimension[];
}

const MATEMATICAS: MateriaCatalogo = {
  clave: 'fundamentos de matematicas',
  nombre: 'Fundamentos de Matemáticas',
  alias: ['matematicas', 'fundamentos de matematica', 'fundamentos matematicas'],
  hito: 'Inicial',
  gestion: '2026',
  instrumento: 'Examen y lista de cotejo — Fundamentos de Matemáticas (30 min)',
  duracionMin: 30,
  dimensiones: [
    {
      id: 'P1',
      etiqueta: 'Ejercicio 1 — Álgebra, exponentes y logaritmos',
      consigna: 'Ecuación logarítmica en base 3: dominio, resolución y conjunto solución.',
      max: 35,
      reactivos: [
        {
          id: 'MAT-1.1',
          nombre: 'Restricción de dominio del logaritmo',
          puntos: 10,
          unidad: 'Unidad 1. Fundamentos del álgebra',
          evidencia:
            'Plantea y resuelve las inecuaciones de los argumentos y obtiene la intersección de dominios.',
          carencia:
            'No plantea o no resuelve la restricción de dominio, por lo que no puede descartar raíces extrañas.',
          accion:
            'Practicar inecuaciones lineales y su intersección en la recta real antes de resolver ecuaciones logarítmicas.',
        },
        {
          id: 'MAT-1.2',
          nombre: 'Resolución con leyes de logaritmos y ecuación cuadrática',
          puntos: 20,
          unidad: 'Unidades 1 y 4. Álgebra y teoría de exponentes y logaritmos',
          evidencia:
            'Aplica la propiedad de suma de logaritmos, convierte a forma exponencial y resuelve la ecuación cuadrática resultante.',
          carencia:
            'No logra transformar la ecuación logarítmica en una ecuación algebraica equivalente o falla al factorizar el trinomio.',
          accion:
            'Reforzar propiedades de logaritmos y factorización de trinomios con ejercicios guiados de dificultad creciente.',
        },
        {
          id: 'MAT-1.3',
          nombre: 'Verificación y conjunto solución',
          puntos: 5,
          unidad: 'Unidad 1. Fundamentos del álgebra',
          evidencia:
            'Contrasta cada raíz con el dominio y declara formalmente el conjunto solución.',
          carencia:
            'Declara como solución una raíz que no pertenece al dominio de la ecuación.',
          accion:
            'Incorporar la verificación obligatoria como último paso de toda ecuación con dominio restringido.',
        },
      ],
    },
    {
      id: 'P2',
      etiqueta: 'Ejercicio 2 — Identidad trigonométrica',
      consigna: 'Demostración analítica de una identidad trigonométrica fundamental.',
      max: 30,
      reactivos: [
        {
          id: 'MAT-2.1',
          nombre: 'Sustitución de la identidad pitagórica',
          puntos: 10,
          unidad: 'Unidad 2. Trigonometría e identidades trigonométricas',
          evidencia: 'Sustituye la función por 1 − cos² usando la identidad pitagórica.',
          carencia: 'No reconoce la identidad pitagórica ni la sustitución que habilita la demostración.',
          accion: 'Memorizar y aplicar las identidades pitagóricas en ejercicios de simplificación.',
        },
        {
          id: 'MAT-2.2',
          nombre: 'Factorización por diferencia de cuadrados',
          puntos: 10,
          unidad: 'Unidad 2. Trigonometría e identidades trigonométricas',
          evidencia: 'Reconoce el numerador como diferencia de cuadrados y lo factoriza.',
          carencia: 'No factoriza la diferencia de cuadrados y la expresión queda sin simplificar.',
          accion: 'Repasar productos notables y factorización antes de trabajar con fracciones algebraicas.',
        },
        {
          id: 'MAT-2.3',
          nombre: 'Simplificación y cierre de la demostración',
          puntos: 10,
          unidad: 'Unidad 2. Trigonometría e identidades trigonométricas',
          evidencia: 'Cancela el binomio común y llega al miembro derecho operando términos semejantes.',
          carencia: 'Cancela términos sin justificar o no logra cerrar la igualdad con el miembro derecho.',
          accion: 'Trabajar demostraciones de identidades paso a paso con justificación escrita de cada operación.',
        },
      ],
    },
    {
      id: 'P3',
      etiqueta: 'Ejercicio 3 — Funciones y geometría analítica',
      consigna: 'Vértice de una parábola y recta perpendicular en forma general.',
      max: 35,
      reactivos: [
        {
          id: 'MAT-3.1',
          nombre: 'Coordenadas del vértice de la parábola',
          puntos: 15,
          unidad: 'Unidad 3. Funciones y sus gráficas',
          evidencia: 'Identifica coeficientes, calcula la abscisa con −b/2a y la ordenada por sustitución.',
          carencia: 'No identifica los coeficientes de la forma cuadrática o aplica mal la fórmula del vértice.',
          accion: 'Practicar la forma general de la parábola y el cálculo del vértice con verificación gráfica.',
        },
        {
          id: 'MAT-3.2',
          nombre: 'Pendiente de la recta perpendicular',
          puntos: 10,
          unidad: 'Unidad 5. Geometría analítica en el plano',
          evidencia: 'Obtiene la pendiente de la recta dada y aplica la condición de perpendicularidad.',
          carencia: 'Confunde la condición de paralelismo con la de perpendicularidad.',
          accion: 'Comparar rectas paralelas y perpendiculares en el plano con ejemplos gráficos.',
        },
        {
          id: 'MAT-3.3',
          nombre: 'Ecuación punto-pendiente y forma general',
          puntos: 10,
          unidad: 'Unidad 5. Geometría analítica en el plano',
          evidencia: 'Aplica punto-pendiente y agrupa los términos en la forma general Ax + By + C = 0.',
          carencia: 'No aplica la forma punto-pendiente o no convierte el resultado a la forma general solicitada.',
          accion: 'Ejercitar el paso de forma punto-pendiente a forma general con y sin fracciones.',
        },
      ],
    },
  ],
};

const PROGRAMACION: MateriaCatalogo = {
  clave: 'introduccion a la programacion',
  nombre: 'Introducción a la Programación',
  alias: ['introduccion a programacion', 'introduccion programacion', 'programacion'],
  hito: 'Inicial',
  gestion: '2026',
  instrumento: 'Hoja de examen — Introducción a la Programación (40 min)',
  duracionMin: 40,
  dimensiones: [
    {
      id: 'P1',
      etiqueta: 'Pregunta 1 — Estructuras de control de flujo',
      consigna: 'Completar el esqueleto que cuenta vocales de una palabra.',
      max: 30,
      reactivos: [
        {
          id: 'PRO-1.1',
          nombre: 'Recorrido de la cadena con un ciclo for',
          puntos: 10,
          unidad: 'Unidad 3. Estructuras de control de flujo',
          evidencia: 'Completa la estructura del ciclo e indica la variable de iteración y la secuencia a recorrer.',
          carencia: 'No reconoce la sintaxis del ciclo for ni la secuencia que debe recorrerse.',
          accion: 'Ejercitar recorridos de cadenas y listas con for en Python.',
        },
        {
          id: 'PRO-1.2',
          nombre: 'Condición de pertenencia a un conjunto de caracteres',
          puntos: 10,
          unidad: 'Unidad 2. Variables, tipos de datos y operaciones',
          evidencia: 'Usa la variable de control del ciclo en la condición "in" sobre la cadena de vocales.',
          carencia: 'Usa una variable distinta a la del ciclo o plantea una condición que no verifica pertenencia.',
          accion: 'Practicar el operador in con cadenas y la coherencia entre variables del ciclo y del cuerpo.',
        },
        {
          id: 'PRO-1.3',
          nombre: 'Incremento del contador',
          puntos: 10,
          unidad: 'Unidad 2. Variables, tipos de datos y operaciones',
          evidencia: 'Incrementa el contador dentro del if con += 1 o su equivalente.',
          carencia: 'No incrementa el acumulador o lo hace fuera de la rama que corresponde.',
          accion: 'Trabajar patrones de acumulación y conteo con trazas de ejecución.',
        },
      ],
    },
    {
      id: 'P2',
      etiqueta: 'Pregunta 2 — Variables, operaciones y diseño lógico',
      consigna: 'Evaluación paso a paso de una expresión booleana y clasificación de temperatura con bifurcaciones.',
      max: 35,
      reactivos: [
        {
          id: 'PRO-2.1',
          nombre: 'Evaluación paso a paso y precedencia de operadores',
          puntos: 15,
          unidad: 'Unidad 2. Variables, tipos de datos y operaciones',
          evidencia:
            'Resuelve aritmética, comparaciones, operadores lógicos internos, negación y resultado final en ese orden.',
          carencia: 'No respeta la jerarquía de operadores o confunde el resultado de la división entera y el módulo.',
          accion: 'Practicar tablas de precedencia y evaluación de expresiones booleanas por pasos.',
        },
        {
          id: 'PRO-2.2',
          nombre: 'Diseño lógico con bifurcaciones',
          puntos: 20,
          unidad: 'Unidad 3. Estructuras de control de flujo',
          evidencia:
            'Diseña una solución con if/elif/else que cubre los tres rangos de temperatura sin solapamientos.',
          carencia: 'No cubre todos los rangos o los solapa, de modo que el programa clasifica mal algunos valores.',
          accion: 'Diseñar soluciones con rangos exhaustivos y excluyentes, probando los valores límite.',
        },
      ],
    },
    {
      id: 'P3',
      etiqueta: 'Pregunta 3 — Análisis y selección de código iterativo',
      consigna: 'Elegir el código correcto y justificar los errores de las otras dos opciones.',
      max: 35,
      reactivos: [
        {
          id: 'PRO-3.1',
          nombre: 'Selección del código correcto',
          puntos: 5,
          unidad: 'Unidad 4. Funciones y modularidad en programación',
          evidencia: 'Identifica la opción que convierte el dato y acumula fuera del ciclo (opción C).',
          carencia: 'Selecciona una opción que falla por conversión de tipo o por reinicialización del acumulador.',
          accion: 'Comparar fragmentos equivalentes y localizar la diferencia que altera el resultado.',
        },
        {
          id: 'PRO-3.2',
          nombre: 'Justificación del error de conversión de tipo',
          puntos: 15,
          unidad: 'Unidad 2. Variables, tipos de datos y operaciones',
          evidencia:
            'Explica que input() devuelve texto y que comparar str con int produce TypeError en tiempo de ejecución.',
          carencia: 'No identifica que la entrada debe convertirse con int() ni la consecuencia de comparar tipos distintos.',
          accion: 'Reforzar tipado dinámico en Python y el uso de int()/float() al leer datos.',
        },
        {
          id: 'PRO-3.3',
          nombre: 'Justificación del error de inicialización del acumulador',
          puntos: 15,
          unidad: 'Unidad 3. Estructuras de control de flujo',
          evidencia:
            'Explica que declarar el contador dentro del ciclo lo reinicia en cada iteración y pierde el total.',
          carencia: 'No advierte que el acumulador reiniciado dentro del ciclo invalida el conteo final.',
          accion: 'Analizar el alcance de variables y el patrón acumulador con trazas de iteraciones.',
        },
      ],
    },
  ],
};

const ESTRUCTURAS: MateriaCatalogo = {
  clave: 'estructura de datos',
  nombre: 'Estructuras de Datos',
  alias: ['estructuras de datos', 'estructura de datos', 'poo', 'estructuras'],
  hito: 'Inicial',
  gestion: '2026',
  instrumento: 'Hoja de examen — Estructuras de Datos (35 min)',
  duracionMin: 35,
  dimensiones: [
    {
      id: 'P1',
      etiqueta: 'Pregunta 1 — Herencia y reutilización',
      consigna: 'Implementar la clase hija Gerente heredando de Empleado.',
      max: 35,
      reactivos: [
        {
          id: 'EST-1.1',
          nombre: 'Herencia y llamado al constructor padre',
          puntos: 15,
          unidad: 'Unidad 2. Introducción a la programación orientada a objetos',
          evidencia: 'Declara la clase hija e invoca super().__init__(...) con todos los parámetros.',
          carencia:
            'No utiliza super().__init__() y duplica la asignación de atributos, rompiendo la reutilización.',
          accion: 'Modelar jerarquías simples con herencia y constructor delegado.',
        },
        {
          id: 'EST-1.2',
          nombre: 'Sobrescritura con reutilización del método padre',
          puntos: 15,
          unidad: 'Unidad 3. POO, parte 1',
          evidencia: 'Sobrescribe mostrar_info() llamando a super().mostrar_info() y concatenando el departamento.',
          carencia: 'Reescribe la cadena completa en lugar de reutilizar el método de la clase base.',
          accion: 'Practicar sobrescritura de métodos manteniendo la llamada al padre.',
        },
        {
          id: 'EST-1.3',
          nombre: 'Instanciación y llamada al método',
          puntos: 5,
          unidad: 'Unidad 2. Introducción a la programación orientada a objetos',
          evidencia: 'Instancia un objeto de la clase hija con valores válidos e invoca el método.',
          carencia: 'No instancia el objeto o lo hace con argumentos inconsistentes.',
          accion: 'Ejercitar creación de objetos y verificación de salidas esperadas.',
        },
      ],
    },
    {
      id: 'P2',
      etiqueta: 'Pregunta 2 — Polimorfismo',
      consigna: 'Completar la tabla analítica de dos fragmentos de código.',
      max: 30,
      reactivos: [
        {
          id: 'EST-2.1',
          nombre: 'Identificación del tipo de polimorfismo',
          puntos: 10,
          unidad: 'Unidad 3. POO, parte 1',
          evidencia: 'Distingue sobrecarga (parámetros por defecto) de inclusión (sobrescritura).',
          carencia: 'Confunde sobrecarga con sobrescritura o no reconoce el tipo aplicado en cada fragmento.',
          accion: 'Comparar sobrecarga, sobrescritura y polimorfismo de inclusión con ejemplos mínimos.',
        },
        {
          id: 'EST-2.2',
          nombre: 'Salida esperada en consola',
          puntos: 10,
          unidad: 'Unidad 3. POO, parte 1',
          evidencia: 'Predice las salidas 15, 12 y "Guau guau" para los fragmentos dados.',
          carencia: 'No predice correctamente la salida, lo que indica que no traza la ejecución del código.',
          accion: 'Realizar trazas manuales de ejecución antes de ejecutar el programa.',
        },
        {
          id: 'EST-2.3',
          nombre: 'Justificación teórica del polimorfismo',
          puntos: 10,
          unidad: 'Unidad 3. POO, parte 1',
          evidencia: 'Explica cómo actúa el concepto en cada fragmento con vocabulario técnico.',
          carencia: 'Describe el código sin explicar el mecanismo de resolución dinámica o de parámetros por defecto.',
          accion: 'Redactar justificaciones técnicas breves usando el vocabulario del paradigma.',
        },
      ],
    },
    {
      id: 'P3',
      etiqueta: 'Pregunta 3 — Encapsulamiento y control de integridad',
      consigna: 'Justificar y corregir una clase que permite estados inválidos.',
      max: 35,
      reactivos: [
        {
          id: 'EST-3.1',
          nombre: 'Justificación teórica del encapsulamiento',
          puntos: 10,
          unidad: 'Unidad 4. POO, parte 2',
          evidencia: 'Explica que el acceso directo impide validar el estado interno del objeto.',
          carencia: 'No relaciona el acceso público al atributo con la pérdida de integridad de los datos.',
          accion: 'Discutir invariantes de clase y estados inválidos con ejemplos concretos.',
        },
        {
          id: 'EST-3.2',
          nombre: 'Implementación de getter y setter con validación',
          puntos: 25,
          unidad: 'Unidad 4. POO, parte 2',
          evidencia:
            'Declara el atributo privado, implementa get_edad y set_edad con validación de valores positivos.',
          carencia: 'No declara el atributo privado o el setter no valida el valor antes de asignarlo.',
          accion: 'Implementar propiedades con validación y usar el setter desde el constructor.',
        },
      ],
    },
  ],
};

const INGLES: MateriaCatalogo = {
  clave: 'ingles',
  nombre: 'Inglés',
  alias: ['ingles', 'ingles technical it', 'english'],
  hito: 'Inicial',
  gestion: '2026',
  instrumento: 'Hoja de examen — Inglés (30 min)',
  duracionMin: 30,
  dimensiones: [
    {
      id: 'P1',
      etiqueta: 'Section 1 — Technical IT vocabulary',
      consigna: 'Relacionar seis términos técnicos con su definición en inglés.',
      max: 30,
      reactivos: [
        { id: 'ING-1.1', nombre: 'Database', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia database con «an organized collection of structured data».', carencia: 'No reconoce el término database ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
        { id: 'ING-1.2', nombre: 'Bandwidth', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia bandwidth con la tasa máxima de transferencia de datos.', carencia: 'No reconoce el término bandwidth ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
        { id: 'ING-1.3', nombre: 'Algorithm', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia algorithm con un conjunto de instrucciones para realizar una tarea.', carencia: 'No reconoce el término algorithm ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
        { id: 'ING-1.4', nombre: 'Browser', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia browser con la aplicación para acceder a sitios web.', carencia: 'No reconoce el término browser ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
        { id: 'ING-1.5', nombre: 'Encryption', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia encryption con la conversión de información en código secreto.', carencia: 'No reconoce el término encryption ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
        { id: 'ING-1.6', nombre: 'Bug', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Asocia bug con un defecto del programa.', carencia: 'No reconoce el término bug ni su definición.', accion: 'Construir un glosario técnico bilingüe de uso diario en laboratorio.' },
      ],
    },
    {
      id: 'P2',
      etiqueta: 'Section 2 — Grammar in context',
      consigna: 'Completar ocho verbos de un ticket técnico en el tiempo correcto.',
      max: 40,
      reactivos: [
        { id: 'ING-2.1', nombre: 'Past simple: stopped', puntos: 5, unidad: 'Unidad 3. Describing past routines', evidencia: 'Conjuga stopped reconociendo el marcador «yesterday».', carencia: 'No reconoce el marcador temporal de pasado o falla la forma irregular/duplicación de consonante.', accion: 'Trabajar marcadores temporales y conjugación en textos técnicos.' },
        { id: 'ING-2.2', nombre: 'Present continuous: is investigating', puntos: 5, unidad: 'Unidad 2. Present continuous', evidencia: 'Conjuga is investigating reconociendo «right now».', carencia: 'No distingue la acción en progreso del presente simple.', accion: 'Contrastar presente simple y continuo con marcadores explícitos.' },
        { id: 'ING-2.3', nombre: 'Past simple: changed', puntos: 5, unidad: 'Unidad 3. Describing past routines', evidencia: 'Conjuga changed reconociendo «two days ago».', carencia: 'No identifica la acción completada en el pasado.', accion: 'Reconocer expresiones de tiempo pasado en textos de soporte técnico.' },
        { id: 'ING-2.4', nombre: 'Present continuous: is rebooting', puntos: 5, unidad: 'Unidad 2. Present continuous', evidencia: 'Conjuga is rebooting reconociendo «currently».', carencia: 'No reconoce la acción en curso marcada por «currently».', accion: 'Practicar el presente continuo en descripciones de estado de sistemas.' },
        { id: 'ING-2.5', nombre: 'Simple present: perform', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Conjuga perform reconociendo la rutina «every midnight».', carencia: 'No reconoce el hábito o rutina que exige presente simple.', accion: 'Practicar rutinas y frecuencias en contextos de operación de sistemas.' },
        { id: 'ING-2.6', nombre: 'Simple present: expect', puntos: 5, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Conjuga expect como verbo de estado.', carencia: 'Aplica erróneamente un tiempo continuo a un verbo de estado.', accion: 'Identificar verbos de estado que no admiten forma continua.' },
        { id: 'ING-2.7', nombre: 'First conditional: persists', puntos: 5, unidad: 'Unidad 4. Expressing the future', evidencia: 'Conjuga persists en la cláusula condicional.', carencia: 'No reconoce la estructura del condicional tipo 1.', accion: 'Practicar condicionales tipo 1 en instrucciones de soporte.' },
        { id: 'ING-2.8', nombre: 'Imperative: do not', puntos: 5, unidad: 'Unidad 4. Expressing the future', evidencia: 'Completa el imperativo negativo con do.', carencia: 'No reconoce la forma imperativa negativa.', accion: 'Trabajar instrucciones y advertencias en manuales técnicos.' },
      ],
    },
    {
      id: 'P3',
      etiqueta: 'Section 3 — Reading comprehension',
      consigna: 'Cinco enunciados de verdadero/falso sobre un texto de computación en la nube.',
      max: 30,
      reactivos: [
        { id: 'ING-3.1', nombre: 'Comprensión: compra de centros de datos', puntos: 6, unidad: 'Unidad 3. Describing past routines', evidencia: 'Identifica que el texto descarta comprar infraestructura propia (Falso).', carencia: 'No distingue la idea de «en lugar de comprar» del texto original.', accion: 'Practicar lectura de textos técnicos identificando la idea principal y los matices negativos.' },
        { id: 'ING-3.2', nombre: 'Comprensión: proveedores de nube', puntos: 6, unidad: 'Unidad 1. Grammar and daily life', evidencia: 'Reconoce AWS y Azure como proveedores (Verdadero).', carencia: 'No localiza los ejemplos de proveedores mencionados en el texto.', accion: 'Leer artículos técnicos cortos y extraer ejemplos explícitos.' },
        { id: 'ING-3.3', nombre: 'Comprensión: escalabilidad instantánea', puntos: 6, unidad: 'Unidad 2. Present continuous', evidencia: 'Identifica la escalabilidad como beneficio (Verdadero).', carencia: 'No relaciona «scale resources instantly» con el beneficio enunciado.', accion: 'Relacionar términos técnicos con sus beneficios descritos en el texto.' },
        { id: 'ING-3.4', nombre: 'Comprensión: gasto de capital', puntos: 6, unidad: 'Unidad 3. Describing past routines', evidencia: 'Distingue que el modelo reduce, no aumenta, el gasto de capital (Falso).', carencia: 'Invierte el sentido de «reduces capital expenses».', accion: 'Trabajar verbos de cambio (increase/decrease/reduce) en lectura técnica.' },
        { id: 'ING-3.5', nombre: 'Comprensión: seguridad en la nube', puntos: 6, unidad: 'Unidad 4. Expressing the future', evidencia: 'Reconoce que la seguridad sigue siendo una preocupación (Falso).', carencia: 'No interpreta la advertencia final del texto sobre seguridad.', accion: 'Analizar la estructura de párrafos técnicos: beneficio, limitación y advertencia.' },
      ],
    },
  ],
};

const LOGICA: MateriaCatalogo = {
  clave: 'logica',
  nombre: 'Lógica',
  alias: ['logica', 'logica proposicional'],
  hito: 'Inicial',
  gestion: '2026',
  instrumento: 'Instrumento de evaluación — Lógica (30 min, 10 ítems de selección múltiple)',
  duracionMin: 30,
  dimensiones: [
    {
      id: 'GLOBAL',
      etiqueta: 'Sección I — Selección múltiple',
      consigna: 'Diez ítems de selección múltiple sobre lógica proposicional, predicados y conjuntos.',
      max: 100,
      reactivos: [
        { id: 'LOG-1', nombre: 'Ítem 1 — Naturaleza de las proposiciones', puntos: 10, unidad: 'Unidad 1. Lógica proposicional', evidencia: 'Reconoce qué enunciado es una proposición lógica válida.', carencia: 'No distingue proposiciones de preguntas, órdenes o expresiones abiertas.', accion: 'Clasificar enunciados según su valor de verdad.' },
        { id: 'LOG-2', nombre: 'Ítem 2 — Condicional y tabla de verdad', puntos: 10, unidad: 'Unidad 1. Lógica proposicional', evidencia: 'Identifica el único caso en que p → q es falsa.', carencia: 'Confunde el valor de verdad del condicional con el del bicondicional.', accion: 'Construir tablas de verdad de los conectivos básicos.' },
        { id: 'LOG-3', nombre: 'Ítem 3 — Clasificación de formas proposicionales', puntos: 10, unidad: 'Unidad 1. Lógica proposicional', evidencia: 'Distingue tautología, contradicción y contingencia.', carencia: 'No clasifica la forma proposicional a partir de su tabla de verdad.', accion: 'Analizar columnas resultado de tablas completas.' },
        { id: 'LOG-4', nombre: 'Ítem 4 — Leyes de De Morgan', puntos: 10, unidad: 'Unidad 1. Lógica proposicional', evidencia: 'Aplica correctamente ¬(p ∧ q) ≡ ¬p ∨ ¬q.', carencia: 'No aplica la negación de la conjunción según De Morgan.', accion: 'Practicar equivalencias lógicas y su verificación con tablas.' },
        { id: 'LOG-5', nombre: 'Ítem 5 — Cuantificador universal', puntos: 10, unidad: 'Unidad 2. Lógica de predicados', evidencia: 'Identifica el símbolo ∀.', carencia: 'Confunde los cuantificadores universal y existencial.', accion: 'Memorizar simbología de lógica de predicados con ejemplos.' },
        { id: 'LOG-6', nombre: 'Ítem 6 — Operaciones de conjuntos', puntos: 10, unidad: 'Unidad 3. Conjuntos y relaciones', evidencia: 'Reconoce la unión como la operación descrita.', carencia: 'Confunde unión, intersección y diferencia.', accion: 'Operar con conjuntos y representar resultados en diagramas de Venn.' },
        { id: 'LOG-7', nombre: 'Ítem 7 — Leyes de identidad', puntos: 10, unidad: 'Unidad 1. Lógica proposicional', evidencia: 'Simplifica (p ∧ V) ∨ F hasta p.', carencia: 'No aplica las leyes de identidad y dominación.', accion: 'Simplificar expresiones lógicas justificando cada ley.' },
        { id: 'LOG-8', nombre: 'Ítem 8 — Formalización de lenguaje natural', puntos: 10, unidad: 'Unidad 2. Lógica de predicados', evidencia: 'Formaliza la condicional negando el antecedente según el enunciado.', carencia: 'No traslada correctamente el enunciado a la forma simbólica.', accion: 'Traducir enunciados de soporte técnico a fórmulas lógicas.' },
        { id: 'LOG-9', nombre: 'Ítem 9 — Interpretación de diagramas de Venn', puntos: 10, unidad: 'Unidad 3. Conjuntos y relaciones', evidencia: 'Identifica la diferencia A − B en el diagrama.', carencia: 'No interpreta la región sombreada del diagrama.', accion: 'Relacionar regiones de Venn con operaciones de conjuntos.' },
        { id: 'LOG-10', nombre: 'Ítem 10 — Competencia de la asignatura', puntos: 10, unidad: 'Unidad 4. Relaciones y funciones', evidencia: 'Reconoce el propósito formativo de la lógica para el diseño algorítmico.', carencia: 'No vincula la asignatura con el razonamiento aplicado al diseño de soluciones.', accion: 'Relacionar los contenidos lógicos con casos de programación.' },
      ],
    },
  ],
};

export const CATALOGO_REACTIVOS: readonly MateriaCatalogo[] = [
  MATEMATICAS,
  PROGRAMACION,
  ESTRUCTURAS,
  INGLES,
  LOGICA,
];

function coinciden(claveA: string, claveB: string): boolean {
  if (claveA === claveB) return true;
  const a = claveA.split(' ');
  const b = claveB.split(' ');
  const corto = a.length <= b.length ? a : b;
  const largo = a.length <= b.length ? b : a;
  if (corto.length === 0) return false;
  return corto.every((palabra) => largo.includes(palabra));
}

/** Busca la asignatura en el catálogo tolerando acentos, plurales y alias. */
export function buscarMateria(nombre: string): MateriaCatalogo | null {
  const clave = claveMateria(nombre);
  if (!clave) return null;
  for (const materia of CATALOGO_REACTIVOS) {
    if (coinciden(clave, materia.clave)) return materia;
    for (const alias of materia.alias) {
      if (coinciden(clave, claveMateria(alias))) return materia;
    }
  }
  return null;
}

/** Máximos por dimensión según el instrumento; `null` si la asignatura no está catalogada. */
export function maximosDe(materia: MateriaCatalogo): Record<string, number> {
  const maximos: Record<string, number> = {};
  for (const dimension of materia.dimensiones) maximos[dimension.id] = dimension.max;
  return maximos;
}

/** Puntaje total del instrumento (debe ser 100). */
export function totalInstrumento(materia: MateriaCatalogo): number {
  return materia.dimensiones.reduce((suma, dimension) => suma + dimension.max, 0);
}

export function dimensionPorId(materia: MateriaCatalogo, id: string): Dimension | null {
  return materia.dimensiones.find((dimension) => dimension.id === id) ?? null;
}
