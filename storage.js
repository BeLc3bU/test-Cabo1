const KEYS = {
    HIGH_SCORE: 'testCabo1HighScore',
    UNSEEN_QUESTIONS: 'testCabo1UnseenQuestions',
    FAILED_QUESTIONS: 'testCabo1FailedQuestions',
    THEME: 'testCabo1Theme',
    SESSION_REPASO: 'testCabo1RepasoState',
    SESSION_IMPRESCINDIBLE: 'testCabo1ImprescindibleState',
    SESSION_NORMAL: 'testCabo1State_normal',
    SESSION_EXAMEN_2022: 'testCabo1Examen2022State',
    SESSION_EXAMEN_2024: 'testCabo1Examen2024State',
    SESSION_EXAMEN_2025ET: 'testCabo1Examen2025ETState',
    SESSION_SIMULACRO_1: 'testCabo1Simulacro1State',
    SESSION_SIMULACRO_2: 'testCabo1Simulacro2State',
    SESSION_SIMULACRO_3: 'testCabo1Simulacro3State',
    SOUND_MUTED: 'testCabo1SoundMuted',
    NUM_PREGUNTAS: 'testCabo1NumPreguntas',
    TOTAL_QUESTIONS: 'testCabo1TotalQuestionsCount',
};

function getSessionKey(modo) {
    switch (modo) {
        case 'repaso': return KEYS.SESSION_REPASO;
        case 'normal': return KEYS.SESSION_NORMAL;
        // Para todos los demás modos (imprescindible, exámenes, simulacros),
        // usamos una clave dinámica para simplificar y dar soporte a futuros modos
        // sin tener que modificar este switch.
        default: return `testCabo1State_${modo}`;
    }
}

function get(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Error al parsear datos de localStorage para clave "${key}":`, error);
        return null;
    }
}

function set(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error al guardar datos en localStorage para clave "${key}":`, error);
        // Intentar limpiar localStorage si está lleno
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage lleno, intentando limpiar datos antiguos...');
            clearOldData();
            // Intentar guardar de nuevo
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (retryError) {
                console.error('No se pudo guardar después de limpiar localStorage:', retryError);
            }
        }
    }
}

function remove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error al eliminar datos de localStorage para clave "${key}":`, error);
    }
}

function clearOldData() {
    const keysToKeep = ['testCabo1HighScore', 'testCabo1Theme'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error(`Error al limpiar clave "${key}":`, error);
            }
        }
    });
}

export const storage = {
    getHighScore: () => get(KEYS.HIGH_SCORE) || 0,
    setHighScore: (score) => set(KEYS.HIGH_SCORE, score),

    getUnseenQuestionIndices: () => get(KEYS.UNSEEN_QUESTIONS),
    setUnseenQuestionIndices: (indices) => set(KEYS.UNSEEN_QUESTIONS, indices),

    getFailedQuestionsIndices: () => get(KEYS.FAILED_QUESTIONS) || [],
    setFailedQuestionsIndices: (indices) => set(KEYS.FAILED_QUESTIONS, indices),

    getTheme: () => localStorage.getItem(KEYS.THEME), // Theme is stored as a raw string
    setTheme: (theme) => localStorage.setItem(KEYS.THEME, theme),

    getMuteState: () => get(KEYS.SOUND_MUTED) === true, // Devuelve booleano
    setMuteState: (isMuted) => set(KEYS.SOUND_MUTED, isMuted),

    getNumPreguntas: () => get(KEYS.NUM_PREGUNTAS) || 20, // Valor por defecto 20
    setNumPreguntas: (num) => set(KEYS.NUM_PREGUNTAS, num),

    getTotalQuestionsCount: () => get(KEYS.TOTAL_QUESTIONS),
    setTotalQuestionsCount: (count) => set(KEYS.TOTAL_QUESTIONS, count),

    getSession: (modo) => get(getSessionKey(modo)),
    setSession: (modo, estado) => set(getSessionKey(modo), estado),
    removeSession: (modo) => remove(getSessionKey(modo)),

    addFailedQuestion: (indiceGlobal) => {
        if (indiceGlobal === -1) return;
        const fallos = storage.getFailedQuestionsIndices();
        if (!fallos.includes(indiceGlobal)) {
            fallos.push(indiceGlobal);
            storage.setFailedQuestionsIndices(fallos);
        }
    },

    removeFailedQuestion: (indiceGlobal) => {
        if (indiceGlobal === -1) return;
        let fallos = storage.getFailedQuestionsIndices();
        if (fallos.includes(indiceGlobal)) {
            fallos = fallos.filter(i => i !== indiceGlobal);
            storage.setFailedQuestionsIndices(fallos);
        }
    },

    // Para compatibilidad con la refactorización de app.js
    getSavedSession: (modo) => localStorage.getItem(getSessionKey(modo)),
};