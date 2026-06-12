import { storage } from './storage.js';
import { questionBank, loadAllQuestions as loadQuestions } from './questionManager.js';

let currentTestSession = null;

export const cargarTodasLasPreguntas = loadQuestions;

/**
 * Prepara las preguntas para un test en modo 'normal'.
 * Selecciona preguntas no vistas de forma aleatoria.
 * @param {object} opciones - Opciones para el test, como numPreguntas.
 * @returns {Array<object>} - Un array de preguntas para el test.
 */
function prepararTestNormal(opciones) {
    const { numPreguntas = 20 } = opciones;
    let preguntasNoVistasIndices = questionBank.getUnseenIndices();

    if (preguntasNoVistasIndices.length === 0) {
        alert('¡Enhorabuena! Has visto todas las preguntas. El ciclo de preguntas se reiniciará.');
        questionBank.resetUnseen();
        preguntasNoVistasIndices = questionBank.getUnseenIndices();
    }

    const allQuestions = questionBank.getAll();
    
    // Agrupar los índices de preguntas no vistas por tema
    const noVistasPorTema = new Map();
    preguntasNoVistasIndices.forEach(index => {
        const q = allQuestions[index];
        if (q) {
            const tema = q.tema || 'General';
            if (!noVistasPorTema.has(tema)) {
                noVistasPorTema.set(tema, []);
            }
            noVistasPorTema.get(tema).push(index);
        }
    });

    const totalNoVistas = preguntasNoVistasIndices.length;
    const targetCount = Math.min(totalNoVistas, numPreguntas);
    const indicesParaElTest = [];

    // Calcular cuotas iniciales por tema proporcionales
    const cuotas = new Map();
    let cuotaTotal = 0;
    
    for (const [tema, indices] of noVistasPorTema.entries()) {
        const cuota = Math.round((indices.length / totalNoVistas) * targetCount);
        cuotas.set(tema, cuota);
        cuotaTotal += cuota;
    }

    // Ajustar cuota total por redondeo
    let diferencia = targetCount - cuotaTotal;
    const temasKeys = Array.from(noVistasPorTema.keys());
    // Barajar los temas para distribuir la diferencia de redondeo de forma justa
    questionBank.shuffle(temasKeys);
    
    let idx = 0;
    while (diferencia !== 0 && temasKeys.length > 0) {
        const tema = temasKeys[idx % temasKeys.length];
        const cuotaActual = cuotas.get(tema);
        const maxDisponible = noVistasPorTema.get(tema).length;
        
        if (diferencia > 0) {
            if (cuotaActual < maxDisponible) {
                cuotas.set(tema, cuotaActual + 1);
                diferencia--;
            }
        } else {
            if (cuotaActual > 0) {
                cuotas.set(tema, cuotaActual - 1);
                diferencia++;
            }
        }
        idx++;
        // Si damos una vuelta completa y no podemos cambiar nada, salimos para evitar bucle infinito
        if (idx > temasKeys.length * 2) break;
    }

    // Extraer las preguntas según las cuotas calculadas
    const poolSobrante = []; // Para compensar si algún tema no alcanza su cuota
    
    for (const [tema, indices] of noVistasPorTema.entries()) {
        questionBank.shuffle(indices);
        const cuota = cuotas.get(tema) || 0;
        const seleccionados = indices.slice(0, cuota);
        indicesParaElTest.push(...seleccionados);
        
        // Guardar los no seleccionados como pool de reserva
        const sobrantes = indices.slice(cuota);
        poolSobrante.push(...sobrantes);
    }

    // Si por alguna razón nos faltan preguntas para llegar a targetCount, compensar con el pool de reserva
    if (indicesParaElTest.length < targetCount) {
        questionBank.shuffle(poolSobrante);
        const faltantes = targetCount - indicesParaElTest.length;
        indicesParaElTest.push(...poolSobrante.slice(0, faltantes));
    }

    // Barajar el resultado final para que no salgan agrupadas por tema en el test
    questionBank.shuffle(indicesParaElTest);

    // Actualizar el estado de preguntas no vistas en storage
    const nuevosIndicesNoVistos = preguntasNoVistasIndices.filter(index => !indicesParaElTest.includes(index));
    questionBank.setUnseenIndices(nuevosIndicesNoVistos);

    return indicesParaElTest.map(index => allQuestions[index]);
}

/**
 * Prepara las preguntas para un test que usa una lista predefinida (repaso, examen).
 * @param {object} opciones - Opciones para el test, incluyendo preguntasPersonalizadas.
 * @returns {Array<object>} - Un array de preguntas para el test.
 */
function prepararTestPersonalizado(opciones) {
    const { preguntasPersonalizadas = [] } = opciones;
    return preguntasPersonalizadas;
}

export function prepararTest(modo, opciones = {}) {
    limpiarEstado(modo);

    currentTestSession = {
        preguntasDelTest: [],
        preguntasFalladas: [],
        preguntaActualIndex: 0,
        puntuacion: 0,
        aciertos: 0,
        fallos: 0,
        haRespondido: false,
        modo: modo,
    };

    // Estrategia de preparación de test según el modo.
    // Esta lógica es clave para asegurar que los exámenes y otros modos usen todas sus preguntas.
    let preparador;
    if (modo === 'normal') {
        preparador = prepararTestNormal;
    } else {
        // Para repaso, exámenes, imprescindibles y simulacros, usamos la lista completa de preguntas que nos pasan.
        preparador = prepararTestPersonalizado;
    }
    
    const preguntasSeleccionadas = preparador(opciones);

    currentTestSession.preguntasDelTest = preguntasSeleccionadas.map(p => ({
        ...p,
        indiceGlobal: questionBank.getIndex(p.pregunta)
    }));

    // Barajamos las preguntas para todos los modos que no son 'normal'. 'repaso' también se beneficia de esto.
    if (modo !== 'normal') {
        questionBank.shuffle(currentTestSession.preguntasDelTest);
    }

    return currentTestSession;
}

export function procesarRespuesta(opcionSeleccionada, estadoActual) {
    if (!estadoActual || estadoActual.haRespondido) return null;
    estadoActual.haRespondido = true;

    const preguntaActual = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
    if (!preguntaActual) {
        console.error('Pregunta actual no encontrada');
        return null;
    }

    const esCorrecto = opcionSeleccionada === preguntaActual.respuestaCorrecta;    
    const { indiceGlobal } = preguntaActual;

    if (esCorrecto) {
        estadoActual.puntuacion++;
        estadoActual.aciertos++;
        storage.removeFailedQuestion(indiceGlobal);
    } else {
        estadoActual.puntuacion = parseFloat((estadoActual.puntuacion - 0.33).toFixed(2));
        estadoActual.fallos++;
        if (!estadoActual.preguntasFalladas.some(p => p.preguntaData.pregunta === preguntaActual.pregunta)) {
            estadoActual.preguntasFalladas.push({
                preguntaData: preguntaActual,
                respuestaUsuario: opcionSeleccionada
            });
        }
        storage.addFailedQuestion(indiceGlobal);
    }
    guardarEstado(estadoActual);
    return { esCorrecto, respuestaCorrecta: preguntaActual.respuestaCorrecta, explicacion: preguntaActual.explicacion };
}

export function avanzarPregunta(estadoActual) {
    if (!estadoActual) return { nuevoEstado: null, resultadoFinal: null };
    estadoActual.preguntaActualIndex++;
    estadoActual.haRespondido = false;
    guardarEstado(estadoActual);
    if (estadoActual.preguntaActualIndex >= estadoActual.preguntasDelTest.length) {
        const resultadoFinal = finalizarTest(estadoActual);
        return { nuevoEstado: null, resultadoFinal };
    }
    return { nuevoEstado: estadoActual, resultadoFinal: null };
}

function finalizarTest(estadoAFinalizar) {
    if (!estadoAFinalizar) return null;

    const puntuacionFinal = Math.max(0, estadoAFinalizar.puntuacion).toFixed(2);
    const recordActual = storage.getHighScore();
    let nuevoRecord = false;
    if (estadoAFinalizar.puntuacion > recordActual) {
        storage.setHighScore(estadoAFinalizar.puntuacion);
        nuevoRecord = true;
    }
    const estadoFinalizado = { ...estadoAFinalizar };
    limpiarEstado(estadoAFinalizar.modo);
    const resultado = {
        finalizado: true,
        puntuacionFinal,
        aciertos: estadoFinalizado.aciertos,
        fallos: estadoFinalizado.fallos,
        totalPreguntas: estadoFinalizado.preguntasDelTest.length,
        nuevoRecord,
        preguntasFalladas: estadoFinalizado.preguntasFalladas
    };
    return resultado;
}

export function finalizarTestForzado() {
    const estadoActual = getTestState();
    if (!estadoActual) return null;
    const resultado = finalizarTest(estadoActual);
    currentTestSession = null;
    return resultado;
}

export function guardarEstado(estado) {
    if (estado) storage.setSession(estado.modo, estado);
}

export function cargarEstado(modo) {
    const estadoGuardado = storage.getSession(modo);
    if (estadoGuardado) {
        currentTestSession = estadoGuardado;
        return currentTestSession;
    }
    return null;
}

export function limpiarEstado(modo) {
    storage.removeSession(modo);
    if (currentTestSession && currentTestSession.modo === modo) {
        currentTestSession = null;
    }
}

// Exportamos el objeto storage para que app.js pueda seguir accediendo a él
// y el questionBank para obtener las preguntas.
export { storage, questionBank, getTestState };

function getTestState() { return currentTestSession; }
