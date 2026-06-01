import os
import json

class ValidationAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.input_json = os.path.join(base_dir, "agents", "generated_questions.json")
        self.output_json = os.path.join(base_dir, "agents", "validated_questions.json")

    def validate(self):
        print("[Validation Agent] Iniciando validación sintáctica de preguntas...")
        if not os.path.exists(self.input_json):
            print(f"[Validation Agent] Error: No existe el archivo {self.input_json}")
            return []
            
        with open(self.input_json, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            
        valid_questions = []
        errors = []
        
        for idx, q in enumerate(questions):
            num = idx + 1
            q_errors = []
            
            # 1. Comprobar campos requeridos
            if "pregunta" not in q or not isinstance(q["pregunta"], str) or not q["pregunta"].strip():
                q_errors.append("Falta el campo 'pregunta' o está vacío.")
            if "opciones" not in q or not isinstance(q["opciones"], list):
                q_errors.append("Falta el campo 'opciones' o no es una lista.")
            if "respuestaCorrecta" not in q or not isinstance(q["respuestaCorrecta"], str) or not q["respuestaCorrecta"].strip():
                q_errors.append("Falta el campo 'respuestaCorrecta' o está vacío.")
            if "tema" not in q or not isinstance(q["tema"], str) or not q["tema"].strip():
                q_errors.append("Falta el campo 'tema' o está vacío.")
                
            # Si los campos esenciales están presentes, hacer validación en detalle
            if not q_errors:
                # 2. Comprobar cantidad de opciones
                if len(q["opciones"]) != 4:
                    q_errors.append(f"Debe haber exactamente 4 opciones (encontradas {len(q['opciones'])}).")
                else:
                    # Comprobar que no estén vacías
                    for o_idx, opt in enumerate(q["opciones"]):
                        if not isinstance(opt, str) or not opt.strip():
                            q_errors.append(f"La opción {o_idx + 1} está vacía.")
                            
                    # Comprobar opciones duplicadas
                    if len(set(q["opciones"])) != len(q["opciones"]):
                        q_errors.append("Contiene opciones duplicadas.")
                        
                # 3. Comprobar que la respuesta correcta esté en las opciones
                if q["respuestaCorrecta"] not in q["opciones"]:
                    q_errors.append(f"La 'respuestaCorrecta' ('{q['respuestaCorrecta']}') no se encuentra en las 'opciones'.")
                    
            if q_errors:
                errors.append({
                    "pregunta_idx": idx,
                    "texto": q.get("pregunta", "[Sin Texto]"),
                    "errores": q_errors
                })
            else:
                valid_questions.append(q)
                
        # Guardar reporte de errores si los hay
        if errors:
            report_path = os.path.join(self.base_dir, "agents", "validation_errors.json")
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(errors, f, ensure_ascii=False, indent=2)
            print(f"[Validation Agent] ¡Advertencia! Se encontraron {len(errors)} preguntas con errores. Reporte guardado en {report_path}")
        else:
            print("[Validation Agent] Todas las preguntas pasaron la validación sintáctica.")
            
        with open(self.output_json, 'w', encoding='utf-8') as f:
            json.dump(valid_questions, f, ensure_ascii=False, indent=2)
            
        print(f"[Validation Agent] Guardadas {len(valid_questions)} preguntas válidas en {self.output_json}")
        return valid_questions

if __name__ == '__main__':
    agent = ValidationAgent()
    agent.validate()
