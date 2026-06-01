import fs from 'fs';
import path from 'path';

const baseDir = 'c:/Proyectos/testCabo1';
const nuevomaterialDir = path.join(baseDir, 'nuevomaterial');
const outputFile = path.join(baseDir, 'agents', 'extracted_html_questions.json');

function extractQuestions(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Find index of questions array definition
        const matchRegex = /\b(questions|Q|QS)\s*=\s*\[/i;
        const match = content.match(matchRegex);
        if (!match) {
            return [];
        }
        
        const openBracketIndex = content.indexOf('[', match.index);
        if (openBracketIndex === -1) {
            return [];
        }
        
        let bracketCount = 1;
        let closeBracketIndex = -1;
        for (let i = openBracketIndex + 1; i < content.length; i++) {
            if (content[i] === '[') {
                bracketCount++;
            } else if (content[i] === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                    closeBracketIndex = i;
                    break;
                }
            }
        }
        
        if (closeBracketIndex === -1) {
            return [];
        }
        
        const arrayStr = content.substring(openBracketIndex, closeBracketIndex + 1);
        const getQuestions = new Function(`return ${arrayStr};`);
        const rawQuestions = getQuestions();
        
        return rawQuestions.map(item => {
            const opts = item.opts || item.opciones || item.o;
            const ansIndex = item.ans !== undefined ? item.ans : (item.a !== undefined ? item.a : item.correct);
            const correctText = opts && ansIndex !== undefined ? opts[ansIndex] : null;
            
            return {
                pregunta: item.q || item.pregunta,
                opciones: opts,
                respuestaCorrecta: correctText || item.respuestaCorrecta,
                tema: item.tema || item.t || item.categoria || "General",
                explicacion: item.exp || item.e || item.explicacion || ""
            };
        });
    } catch (e) {
        console.error(`Error parsing ${path.basename(filePath)}:`, e);
        return [];
    }
}

const files = fs.readdirSync(nuevomaterialDir);
let allQuestions = [];

files.forEach(file => {
    if (file.endsWith('.html')) {
        const fullPath = path.join(nuevomaterialDir, file);
        const questions = extractQuestions(fullPath);
        allQuestions = allQuestions.concat(questions);
    }
});

fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2), 'utf-8');
console.log(`[HTML Extractor] Extracted ${allQuestions.length} questions to ${outputFile}`);
