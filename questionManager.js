import { storage } from './storage.js';

let allQuestions = [];
let questionIndexMap = new Map();
let unseenQuestionIndices = [];

async function loadQuestionFile(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error al cargar el archivo ${fileName}:`, error);
        throw new Error(`No se pudo cargar ${fileName}`);
    }
}

function unifyAndDeduplicate(questions) {
    const uniqueQuestions = new Map();
    questions.forEach(q => {
        const key = q.pregunta.trim().toLowerCase();
        if (!uniqueQuestions.has(key)) {
            uniqueQuestions.set(key, { ...q });
        } else {
            const existing = uniqueQuestions.get(key);
            if (q.examen && !existing.examen) {
                existing.examen = q.examen.toString();
            }
            if (q.imprescindible) {
                existing.imprescindible = true;
            }
        }
    });
    return Array.from(uniqueQuestions.values());
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export async function loadAllQuestions() {
    // Carga todos los archivos de preguntas al inicio para que estén disponibles para todos los modos.
    const filesToLoad = ['preguntas.json', 'simulacro_1.json', 'simulacro_2.json', 'simulacro_3.json'];

    const questionSets = await Promise.all(
        filesToLoad.map(file => loadQuestionFile(file))
    );

    const unifiedQuestions = questionSets.flat();
    allQuestions = unifyAndDeduplicate(unifiedQuestions);

    // Normalizar y clasificar dinámicamente los temas de las preguntas
    allQuestions.forEach(q => {
        if (q.tema) {
            let t = q.tema.trim();
            const tLower = t.toLowerCase();
            
            if (tLower === 'dinámica de grupo' || tLower === 'dinamica de grupo' || tLower === 'dinámica de grupos' || tLower === 'dinamica de grupos') {
                q.tema = 'Dinámica de Grupos';
            } else if (tLower === 'expresión oral' || tLower === 'expresion oral' || tLower === 'expresión orgal' || tLower === 'expresion orgal') {
                q.tema = 'Expresión Oral';
            } else if (tLower === 'expresión escrita' || tLower === 'expresion escrita') {
                q.tema = 'Expresión Escrita';
            } else if (tLower === 'apoyo psicológico' || tLower === 'apoyo psicologico') {
                q.tema = 'Apoyo Psicológico';
            } else if (tLower === 'organizaciones internacionales') {
                q.tema = 'Organizaciones Internacionales';
            } else if (tLower === 'historia del ea') {
                q.tema = 'Historia del EA';
            } else if (tLower === 'material aéreo' || tLower === 'material aereo') {
                q.tema = 'Material Aéreo';
            } else if (tLower === 'liderazgo') {
                q.tema = 'Liderazgo';
            } else if (tLower === 'valores militares') {
                q.tema = 'Valores Militares';
            } else if (tLower === 'registro y redacción de documentos' || tLower === 'redacción de documentos militares' || tLower === 'registro y utilización de documentos' || tLower === 'registro y utilizacion de documentos') {
                const text = (q.pregunta + ' ' + (q.explicacion || '')).toLowerCase();
                if (
                    text.includes('10-01') || 
                    text.includes('10_01') || 
                    text.includes('margen') || 
                    text.includes('márgenes') || 
                    text.includes('papel a4') || 
                    text.includes('tratamientos honoríficos') ||
                    text.includes('tratamiento honorífico') ||
                    (text.includes('normativa') && text.includes('redacción') && text.includes('documentos'))
                ) {
                    q.tema = 'Instrucción a la IG 10-01';
                } else if (
                    text.includes('registr') || 
                    text.includes('archiv') || 
                    text.includes('expediente') || 
                    text.includes('signatura') || 
                    text.includes('asiento') || 
                    text.includes('n/ref') || 
                    text.includes('s/ref') ||
                    text.includes('libro de registro')
                ) {
                    q.tema = 'Registro y Utilización de Documentos';
                } else {
                    q.tema = 'Redacción de Documentos Militares';
                }
            }
        } else {
            q.tema = 'General';
        }
    });

    // Crear un mapa para búsqueda de índices O(1)
    allQuestions.forEach((q, index) => {
        questionIndexMap.set(q.pregunta, index);
    });

    if (allQuestions.length === 0) {
        throw new Error("No se cargaron preguntas.");
    }

    const savedIndices = storage.getUnseenQuestionIndices();
    const lastCount = storage.getTotalQuestionsCount();

    if (savedIndices) {
        unseenQuestionIndices = savedIndices;
        
        // Si se han añadido nuevas preguntas, agregamos sus índices a las no vistas
        const effectiveLastCount = lastCount !== null ? lastCount : 369;
        if (allQuestions.length > effectiveLastCount) {
            const newIndices = [];
            for (let i = effectiveLastCount; i < allQuestions.length; i++) {
                newIndices.push(i);
            }
            shuffleArray(newIndices);
            unseenQuestionIndices = [...unseenQuestionIndices, ...newIndices];
            storage.setUnseenQuestionIndices(unseenQuestionIndices);
        }
    } else {
        unseenQuestionIndices = allQuestions.map((_, index) => index);
        shuffleArray(unseenQuestionIndices);
        storage.setUnseenQuestionIndices(unseenQuestionIndices);
    }

    // Actualizar el recuento total de preguntas en localStorage
    storage.setTotalQuestionsCount(allQuestions.length);
}

export const questionBank = {
    getAll: () => allQuestions,
    getQuestionsByExam: (examId) => allQuestions.filter(p => p.examen === examId.toString()),
    getIndex: (preguntaTexto) => questionIndexMap.get(preguntaTexto),
    getUnseenIndices: () => unseenQuestionIndices,
    setUnseenIndices: (indices) => {
        unseenQuestionIndices = indices;
        storage.setUnseenQuestionIndices(indices);
    },
    shuffle: shuffleArray,
    resetUnseen: () => {
        const allIndices = allQuestions.map((_, index) => index);
        shuffleArray(allIndices);
        questionBank.setUnseenIndices(allIndices);
        console.log('Progreso de preguntas no vistas reiniciado.');
    }
};