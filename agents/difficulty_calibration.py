import os
import json

class DifficultyCalibrationAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.input_json = os.path.join(base_dir, "agents", "validated_questions.json")
        self.output_json = os.path.join(base_dir, "agents", "calibrated_questions.json")

    def calibrate(self):
        print("[Difficulty Calibration] Iniciando calibración de dificultad...")
        if not os.path.exists(self.input_json):
            print(f"[Difficulty Calibration] Error: No existe el archivo {self.input_json}")
            return []
            
        with open(self.input_json, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            
        if not questions:
            print("[Difficulty Calibration] No hay preguntas para calibrar.")
            return []
            
        # 1. Calcular puntuación de complejidad para cada pregunta
        # Basado en criterios como longitud de enunciado, longitud de opciones, y palabras complejas (leyes, artículos, números, trampas).
        complexity_scores = []
        for idx, q in enumerate(questions):
            score = 0
            text = q["pregunta"].lower()
            
            # Sumar puntos por longitud
            score += len(q["pregunta"]) * 0.1
            score += sum(len(opt) for opt in q["opciones"]) * 0.15
            
            # Palabras complejas
            if "artículo" in text or "art." in text or "ley" in text or "instrucción" in text or "ig" in text:
                score += 20
            if "trampa" in text or "diferencia" in text or "incorrecta" in text:
                score += 15
            if any(char.isdigit() for char in text): # Contiene números (fechas, años, plazos)
                score += 10
                
            # Si tiene distractores muy cortos (ej. monosílabos o números puros), restar
            if all(len(opt) < 15 for opt in q["opciones"]):
                score -= 15
                
            complexity_scores.append((score, idx))
            
        # 2. Ordenar por puntuación de complejidad
        complexity_scores.sort(key=lambda x: x[0])
        
        # 3. Asignar dificultad según los percentiles objetivo: 30% fácil, 50% media, 20% difícil
        total = len(questions)
        cutoff_facil = int(total * 0.30)
        cutoff_media = int(total * 0.80) # 30% + 50%
        
        for rank, (score, original_idx) in enumerate(complexity_scores):
            if rank < cutoff_facil:
                questions[original_idx]["dificultad"] = "facil"
            elif rank < cutoff_media:
                questions[original_idx]["dificultad"] = "media"
            else:
                questions[original_idx]["dificultad"] = "dificil"
                
        # 4. Verificar distribución resultante
        count_facil = sum(1 for q in questions if q["dificultad"] == "facil")
        count_media = sum(1 for q in questions if q["dificultad"] == "media")
        count_dificil = sum(1 for q in questions if q["dificultad"] == "dificil")
        
        print(f"[Difficulty Calibration] Calibración realizada con éxito:")
        print(f"  - Fáciles: {count_facil} ({count_facil/total*100:.1f}%) [Objetivo: 30%]")
        print(f"  - Medias: {count_media} ({count_media/total*100:.1f}%) [Objetivo: 50%]")
        print(f"  - Difíciles: {count_dificil} ({count_dificil/total*100:.1f}%) [Objetivo: 20%]")
        
        with open(self.output_json, 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
            
        print(f"[Difficulty Calibration] Guardadas {total} preguntas calibradas en {self.output_json}")
        return questions

if __name__ == '__main__':
    agent = DifficultyCalibrationAgent()
    agent.calibrate()
