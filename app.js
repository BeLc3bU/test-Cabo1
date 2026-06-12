import { storage, questionBank, cargarTodasLasPreguntas, prepararTest, procesarRespuesta, avanzarPregunta, finalizarTestForzado, guardarEstado, cargarEstado, limpiarEstado, getTestState } from './state.js';
import { UI } from './ui.js';

let isProcessing = false; // Variable de bloqueo para evitar dobles clics y race conditions
const ui = new UI(); // Instancia única de la clase UI
window.appUI = ui; // Hacer UI disponible globalmente para manejo de errores

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // Mostrar mensaje amigable al usuario para errores no críticos
    if (event.error && event.error.name !== 'ValidationError') {
        const ui = window.appUI; // UI disponible globalmente
        if (ui && ui.showConfirmationModal) {
            ui.showConfirmationModal({
                title: 'Error Inesperado',
                message: 'Ha ocurrido un error inesperado. Por favor, recarga la página.',
                onConfirm: () => window.location.reload(),
                onCancel: () => {}
            });
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada no manejada:', event.reason);
    event.preventDefault(); // Prevenir que aparezca en consola
});

window.addEventListener('load', () => {
    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        ui.initializeTheme(storage.getTheme());
        ui.initializeMuteState(storage.getMuteState());
        ui.initializeNumPreguntas(storage.getNumPreguntas());
        registrarEventListeners();
        try {
            await cargarTodasLasPreguntas(); // Ahora carga todos los exámenes
            actualizarContadoresUI();
            await manejarAccionesDeAtajos();
            intentarRestaurarSesion();
        } catch (error) {
            console.error("Fallo crítico al cargar las preguntas. Los tests no estarán disponibles.", error);
            [
                ui.elements.iniciarNuevoTestBtn,
                ui.elements.iniciarRepasoFallosBtn,
                ui.elements.iniciarTestTemasBtn,
                ui.elements.iniciarSimulacro1Btn,
                ui.elements.iniciarSimulacro2Btn,
                ui.elements.iniciarSimulacro3Btn
            ].forEach(btn => {
                if (btn) { // Comprobación de seguridad
                    btn.disabled = true;
                    btn.title = "Error al cargar preguntas.";
                }
            });
        }
    }

    function intentarRestaurarSesion() {
        const modosPosibles = [
            { nombre: 'normal', clave: 'normal' },
            { nombre: 'simulacro 1', clave: 'simulacro1' },
            { nombre: 'simulacro 2', clave: 'simulacro2' },
            { nombre: 'simulacro 3', clave: 'simulacro3' }
        ];

        for (const modo of modosPosibles) {
            if (storage.getSession(modo.clave)) {
                ui.showConfirmationModal({
                    title: 'Test sin finalizar',
                    message: `Hemos encontrado un test de "${modo.nombre}" sin finalizar. ¿Quieres continuar donde lo dejaste?`,
                    onConfirm: () => restaurarSesion(modo.clave),
                    onCancel: () => {
                        limpiarEstado(modo.clave);
                        ui.showStartView();
                    }
                });
                return; // Salimos del bucle para mostrar solo un modal a la vez
            }
        }

        // Buscar sesiones de temas guardadas dinámicamente en localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('testCabo1State_tema_')) {
                const modoClave = key.substring('testCabo1State_'.length);
                const nombreTema = modoClave.substring('tema_'.length);
                ui.showConfirmationModal({
                    title: 'Test sin finalizar',
                    message: `Hemos encontrado un test del tema "${nombreTema}" sin finalizar. ¿Quieres continuar donde lo dejaste?`,
                    onConfirm: () => restaurarSesion(modoClave),
                    onCancel: () => {
                        limpiarEstado(modoClave);
                        ui.showStartView();
                    }
                });
                return; // Salimos para mostrar solo un modal
            }
        }

        ui.showStartView();
    }

    function restaurarSesion(modo) {
        const estadoGuardado = cargarEstado(modo);
        if (estadoGuardado) {
            ui.showTestView();
            ui.resetTestUI(estadoGuardado);
            ui.updateRecord(storage.getHighScore());
            mostrarPreguntaActual(estadoGuardado);
            if (estadoGuardado.haRespondido) {
                const preguntaData = estadoGuardado.preguntasDelTest[estadoGuardado.preguntaActualIndex] || {};
                const ultimaRespuestaFallada = estadoGuardado.preguntasFalladas.find(p => p.preguntaData.pregunta === preguntaData?.pregunta);
                const opcionSeleccionada = ultimaRespuestaFallada ? ultimaRespuestaFallada.respuestaUsuario : preguntaData.respuestaCorrecta;
                const esCorrecto = !ultimaRespuestaFallada;
                ui.showAnswerFeedback(opcionSeleccionada, esCorrecto, preguntaData.respuestaCorrecta, preguntaData.explicacion);

                // Programar el avance a la siguiente pregunta tras mostrar el feedback al restaurar
                isProcessing = true;
                const delay = esCorrecto ? 1000 : (preguntaData.explicacion ? 4000 : 2500);
                setTimeout(() => {
                    const { nuevoEstado, resultadoFinal } = avanzarPregunta(estadoGuardado);
                    if (resultadoFinal) {
                        ui.showTestResults(resultadoFinal, estadoGuardado.modo, iniciarRepasoFallos, () => { ui.showStartView(); });
                        actualizarContadoresUI();
                    } else {
                        mostrarPreguntaActual(nuevoEstado);
                    }
                    isProcessing = false;
                }, delay);
            }
        }
    }

    async function manejarAccionesDeAtajos() {
        const action = new URLSearchParams(window.location.search).get('action');
        if (action) {
            const button = document.querySelector(`[data-action="${action}"]`);
            if (button) {
                button.click();
            } else {
                console.warn(`No se encontró botón para la acción: ${action}`);
            }
        }
    }

    function actualizarContadoresUI() {
        ui.updateFailedQuestionsButton(storage.getFailedQuestionsIndices().length);
        ui.updateRecord(storage.getHighScore());
    }

    // --- Lógica del Flujo del Test ---
    function iniciarNuevoTest(modo, opciones) {
        limpiarEstado(modo); // Asegura que no haya sesiones previas conflictivas.
        const estadoActual = prepararTest(modo, opciones);
        if (estadoActual.preguntasDelTest.length > 0) {
            ui.showTestView();
            ui.resetTestUI(estadoActual);
            ui.updateRecord(storage.getHighScore());
            mostrarPreguntaActual(estadoActual);
        } else {
            alert(`No hay preguntas disponibles para el modo "${modo}".`);
            ui.showStartView();
        }
    }

    function iniciarTestNormal() {
        const numPreguntas = ui.elements.numPreguntasSelect.value === 'Infinity' ? Infinity : parseInt(ui.elements.numPreguntasSelect.value, 10);
        iniciarNuevoTest('normal', { numPreguntas });
    }

    function iniciarRepasoFallos(preguntasFalladasTest) {
        let indicesFallos;
        // Si se llama desde la pantalla de resultados, se pasan las preguntas falladas de esa sesión.
        if (preguntasFalladasTest) {
            // Usamos el questionBank optimizado para obtener los índices globales de forma eficiente.
            indicesFallos = preguntasFalladasTest.map(item => {
                // Usamos el índice global que ya guardamos en el estado del test.
                const index = item.preguntaData.indiceGlobal;
                return index !== undefined ? index : -1;
            }).filter(index => index !== -1);
        } else {
            indicesFallos = storage.getFailedQuestionsIndices();
        }

        if (indicesFallos.length === 0) {
            alert('¡Felicidades! No tienes preguntas falladas para repasar.');
            return;
        }

        const preguntasParaRepasar = indicesFallos.map(index => questionBank.getAll()[index]).filter(Boolean);
        iniciarNuevoTest('repaso', { preguntasPersonalizadas: preguntasParaRepasar });
    }
    


    function iniciarTestExamen(evaluacionId) {
        const preguntasExamen = questionBank.getQuestionsByExam(evaluacionId);
        if (preguntasExamen.length > 0) {
            iniciarNuevoTest(evaluacionId.toString(), { preguntasPersonalizadas: preguntasExamen });
        } else {
            alert(`No se encontraron preguntas para la evaluación ${evaluacionId}. El archivo podría estar vacío o mal configurado.`);
        }
    }

    function iniciarTestPorTema(tema) {
        const numPreguntas = ui.elements.numPreguntasSelect.value === 'Infinity' ? Infinity : parseInt(ui.elements.numPreguntasSelect.value, 10);
        const preguntasTema = questionBank.getAll().filter(q => q.tema === tema);
        
        if (preguntasTema.length > 0) {
            const seleccionadas = preguntasTema.slice(0, numPreguntas);
            iniciarNuevoTest('tema_' + tema, { preguntasPersonalizadas: seleccionadas });
        } else {
            alert(`No hay preguntas disponibles para el tema "${tema}".`);
        }
    }

    function mostrarPreguntaActual(estadoActual) {
        if (!estadoActual) return;
        const preguntaData = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
        ui.renderQuestion(preguntaData, estadoActual.preguntaActualIndex, estadoActual.preguntasDelTest.length, (opcion) => manejarSeleccionRespuesta(opcion, estadoActual));
    }

    async function manejarSeleccionRespuesta(opcionSeleccionada, estadoActual) {
        if (isProcessing) return;
        isProcessing = true;

        const resultadoRespuesta = procesarRespuesta(opcionSeleccionada, estadoActual);
        if (!resultadoRespuesta) {
            isProcessing = false;
            return;
        }

        ui.showAnswerFeedback(opcionSeleccionada, resultadoRespuesta.esCorrecto, resultadoRespuesta.respuestaCorrecta, resultadoRespuesta.explicacion);
        actualizarContadoresUI();

        // Dar más tiempo si hay una explicación para que el usuario pueda leerla
        const delay = resultadoRespuesta.esCorrecto ? 1000 : (resultadoRespuesta.explicacion ? 4000 : 2500);
        setTimeout(() => {
            const { nuevoEstado, resultadoFinal } = avanzarPregunta(estadoActual);
            if (resultadoFinal) {
                ui.showTestResults(resultadoFinal, estadoActual.modo, iniciarRepasoFallos, () => { ui.showStartView(); });
                actualizarContadoresUI();
            } else {
                mostrarPreguntaActual(nuevoEstado);
            }
            isProcessing = false;
        }, delay);
    }

    function reiniciarProgresoCompleto() {
        questionBank.resetUnseen();
        storage.setFailedQuestionsIndices([]); // También limpiamos los fallos
        actualizarContadoresUI();
        alert('Tu progreso ha sido reiniciado.');
    }
    // --- Registro de Event Listeners ---
    function registrarEventListeners() {
        ui.elements.iniciarNuevoTestBtn.addEventListener('click', iniciarTestNormal);
        ui.elements.iniciarRepasoFallosBtn.addEventListener('click', () => iniciarRepasoFallos());
        if (ui.elements.iniciarTestTemasBtn) {
            ui.elements.iniciarTestTemasBtn.addEventListener('click', () => ui.showTemasMenuView());
        }
        if (ui.elements.volverMenuBtn) {
            ui.elements.volverMenuBtn.addEventListener('click', () => ui.showStartView());
        }
        if (ui.elements.btnTemas) {
            ui.elements.btnTemas.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tema = btn.getAttribute('data-tema');
                    iniciarTestPorTema(tema);
                });
            });
        }
        ui.elements.iniciarSimulacro1Btn.addEventListener('click', () => iniciarTestExamen('simulacro1'));
        ui.elements.iniciarSimulacro2Btn.addEventListener('click', () => iniciarTestExamen('simulacro2'));
        ui.elements.iniciarSimulacro3Btn.addEventListener('click', () => iniciarTestExamen('simulacro3'));

        ui.elements.numPreguntasSelect.addEventListener('change', (e) => {
            const num = e.target.value === 'Infinity' ? Infinity : parseInt(e.target.value, 10);
            storage.setNumPreguntas(num);
        });

        ui.elements.reiniciarProgresoBtn.addEventListener('click', () => {
            ui.showConfirmationModal({
                title: '¿Reiniciar Progreso?',
                message: 'Esta acción borrará tu historial de preguntas falladas y reiniciará el ciclo de preguntas no vistas. ¿Estás seguro?',
                onConfirm: () => {
                    reiniciarProgresoCompleto();
                }
            });
        });

        ui.elements.seguirMasTardeBtn.addEventListener('click', () => {
            guardarEstado(getTestState());
            ui.showStartView();
        });

        ui.elements.finalizarAhoraBtn.addEventListener('click', () => {
            ui.showConfirmationModal({
                title: '¿Finalizar Test?',
                message: 'Tu progreso en este test se perderá. ¿Estás seguro de que quieres finalizar ahora?',
                onConfirm: manejarFinalizarTestForzado
            });
        });

        ui.elements.themeToggleBtn.addEventListener('click', () => {
            const nuevoTema = ui.toggleTheme();
            storage.setTheme(nuevoTema);
        });

        ui.elements.soundToggleBtn.addEventListener('click', () => {
            const isMuted = ui.toggleMute();
            storage.setMuteState(isMuted);
        });

        document.addEventListener('keydown', (e) => {
            const estado = getTestState();
            if (!estado || estado.haRespondido) return;

            const preguntaActual = estado.preguntasDelTest[estado.preguntaActualIndex];
            let opcionSeleccionada = null;

            const keyMap = { 'a': 0, '1': 0, 'b': 1, '2': 1, 'c': 2, '3': 2, 'd': 3, '4': 3 };
            const index = keyMap[e.key.toLowerCase()];

            if (index !== undefined && preguntaActual.opciones[index]) {
                manejarSeleccionRespuesta(preguntaActual.opciones[index], estado);
            }
        });
    }

    function manejarFinalizarTestForzado() {
        if (isProcessing) return;
        isProcessing = true;
        const modoActual = getTestState() ? getTestState().modo : null; // Guardar el modo antes de limpiar el estado
        const resultadoAvance = finalizarTestForzado();
        if (resultadoAvance) {
            // Usar la variable guardada en lugar de intentar acceder al estado ya limpiado
            ui.showTestResults(resultadoAvance, modoActual, iniciarRepasoFallos, () => { ui.showStartView(); });
            actualizarContadoresUI();
        }
        isProcessing = false;
    }

    inicializarApp();
    registrarServiceWorker();
});

// --- Registro del Service Worker (se mantiene fuera del flujo principal de la app) ---
function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker no es soportado por este navegador.');
        return;
    }

    navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
            console.log('Service Worker registrado con éxito:', registration);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('Nueva versión del Service Worker encontrada, instalando...', newWorker);

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('Nueva versión lista para ser activada.');
                        mostrarBannerActualizacion(newWorker);
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error en el registro del Service Worker:', error);
        });
}

function mostrarBannerActualizacion(worker) {
    const banner = document.getElementById('update-banner');
    if (!banner) return;

    banner.classList.remove('oculto');

    document.getElementById('update-now-btn').addEventListener('click', () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
        banner.classList.add('oculto');
        window.location.reload();
    });
}
