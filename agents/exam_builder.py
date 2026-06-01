import os
import json
import random

class ExamBuilderAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.input_json = os.path.join(base_dir, "agents", "deduplicated_questions.json")

    def build_exams(self):
        print("[Exam Builder] Iniciando distribución de preguntas en archivos JSON...")
        if not os.path.exists(self.input_json):
            print(f"[Exam Builder] Error: No existe el archivo {self.input_json}")
            return
            
        with open(self.input_json, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            
        if not questions:
            print("[Exam Builder] No hay preguntas en el pool.")
            return
            
        # Barajar preguntas de forma reproducible
        random.seed(42)
        random.shuffle(questions)
        
        # 1. Quitar asignación de 'imprescindible'
        for q in questions:
            q["imprescindible"] = False
                
        # 2. Construir Simulacros (1, 2, 3) con unas 30 preguntas cada uno (para un pool de ~300)
        # Equilibramos por tema y dificultad en la medida de lo posible
        # Cada simulacro tendrá 30 preguntas seleccionadas al azar
        sim_size = 30
        
        simulacro1_raw = questions[0:sim_size]
        simulacro1 = []
        for q in simulacro1_raw:
            q_copy = dict(q)
            q_copy["examen"] = "simulacro1"
            simulacro1.append(q_copy)
            
        simulacro2_raw = questions[sim_size:sim_size*2]
        simulacro2 = []
        for q in simulacro2_raw:
            q_copy = dict(q)
            q_copy["examen"] = "simulacro2"
            simulacro2.append(q_copy)
            
        simulacro3_raw = questions[sim_size*2:sim_size*3]
        simulacro3 = []
        for q in simulacro3_raw:
            q_copy = dict(q)
            q_copy["examen"] = "simulacro3"
            simulacro3.append(q_copy)
            
        # 3. Guardar todos los archivos JSON en el directorio raíz de la app
        destinations = {
            "preguntas.json": questions,
            "simulacro_1.json": simulacro1,
            "simulacro_2.json": simulacro2,
            "simulacro_3.json": simulacro3
        }
        
        for filename, data in destinations.items():
            path = os.path.join(self.base_dir, filename)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  - Escrito {filename} con {len(data)} preguntas en {path}")
            
        print("[Exam Builder] Escritura de archivos finalizada con éxito.")

if __name__ == '__main__':
    agent = ExamBuilderAgent()
    agent.build_exams()
