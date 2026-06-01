import os
import re
import json

class DuplicateDetectionAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.input_json = os.path.join(base_dir, "agents", "calibrated_questions.json")
        self.output_json = os.path.join(base_dir, "agents", "deduplicated_questions.json")

    def normalize_text(self, text):
        # Convertir a minúsculas y quitar caracteres no alfanuméricos y espacios extra
        text_clean = text.lower()
        text_clean = re.sub(r'[^\w\s]', '', text_clean)
        return " ".join(text_clean.split())

    def get_jaccard_similarity(self, text1, text2):
        words1 = set(self.normalize_text(text1).split())
        words2 = set(self.normalize_text(text2).split())
        if not words1 or not words2:
            return 0.0
        return len(words1.intersection(words2)) / len(words1.union(words2))

    def detect_and_merge(self):
        print("[Duplicate Detection] Iniciando detección de duplicados...")
        if not os.path.exists(self.input_json):
            print(f"[Duplicate Detection] Error: No existe el archivo {self.input_json}")
            return []
            
        with open(self.input_json, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            
        unique_questions = []
        seen_exact = set()
        duplicates_removed = 0
        semantic_removed = 0
        
        for q in questions:
            # 1. Comprobación exacta
            norm_q = self.normalize_text(q["pregunta"])
            if norm_q in seen_exact:
                duplicates_removed += 1
                continue
                
            # 2. Comprobación semántica con el histórico ya guardado
            is_semantic_dup = False
            for u_q in unique_questions:
                if q["tema"] == u_q["tema"]: # Solo comparar dentro del mismo tema para optimizar
                    sim = self.get_jaccard_similarity(q["pregunta"], u_q["pregunta"])
                    if sim > 0.85:
                        is_semantic_dup = True
                        semantic_removed += 1
                        # Si la nueva pregunta tiene una explicación y la vieja no, actualizarla
                        if q.get("explicacion") and not u_q.get("explicacion"):
                            u_q["explicacion"] = q["explicacion"]
                        break
                        
            if not is_semantic_dup:
                seen_exact.add(norm_q)
                unique_questions.append(q)
                
        print(f"[Duplicate Detection] Eliminación finalizada:")
        print(f"  - Duplicados exactos eliminados: {duplicates_removed}")
        print(f"  - Duplicados semánticos (>85% similitud) eliminados: {semantic_removed}")
        print(f"  - Preguntas únicas resultantes: {len(unique_questions)}")
        
        with open(self.output_json, 'w', encoding='utf-8') as f:
            json.dump(unique_questions, f, ensure_ascii=False, indent=2)
            
        print(f"[Duplicate Detection] Guardadas {len(unique_questions)} preguntas deduplicadas en {self.output_json}")
        return unique_questions

if __name__ == '__main__':
    agent = DuplicateDetectionAgent()
    agent.detect_and_merge()
