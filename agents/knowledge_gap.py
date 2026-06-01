import os
import json

class KnowledgeGapAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.input_json = os.path.join(base_dir, "agents", "deduplicated_questions.json")
        self.map_json = os.path.join(base_dir, "agents", "thematic_map.json")
        self.report_json = os.path.join(base_dir, "agents", "knowledge_gaps.json")

    def analyze_gaps(self):
        print("[Knowledge Gap] Analizando cobertura del temario...")
        
        if not os.path.exists(self.input_json) or not os.path.exists(self.map_json):
            print("[Knowledge Gap] Error: Faltan archivos necesarios (deduplicated_questions.json o thematic_map.json).")
            return {}
            
        with open(self.input_json, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            
        with open(self.map_json, 'r', encoding='utf-8') as f:
            thematic_map = json.load(f)
            
        # 1. Contar preguntas por tema
        counts = {}
        for q in questions:
            tema = q["tema"]
            counts[tema] = counts.get(tema, 0) + 1
            
        # 2. Comparar con los mínimos (3 para relevantes, 5 para críticos)
        gaps = {}
        cobertura_report = {}
        
        for topic, details in thematic_map.items():
            importance = details.get("nivel_importancia", "Relevante")
            min_required = 5 if importance == "Crítico" else 3
            current_count = counts.get(topic, 0)
            
            status = "Completo"
            if current_count < min_required:
                status = "Laguna detectada"
                gaps[topic] = {
                    "nivel_importancia": importance,
                    "minimo_requerido": min_required,
                    "actual": current_count,
                    "deficit": min_required - current_count,
                    "subtemas_sugeridos": details.get("subtemas", [])
                }
                
            cobertura_report[topic] = {
                "nivel_importancia": importance,
                "minimo_requerido": min_required,
                "actual": current_count,
                "estado": status
            }
            
        # 3. Guardar el reporte de lagunas
        report = {
            "total_preguntas": len(questions),
            "cobertura_temas": cobertura_report,
            "lagunas_encontradas": gaps
        }
        
        with open(self.report_json, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
            
        print(f"[Knowledge Gap] Análisis finalizado. Se han encontrado {len(gaps)} lagunas de cobertura.")
        for t, g in gaps.items():
            print(f"  - [VACÍO] Tema: '{t}' ({g['nivel_importancia']}) -> Tiene {g['actual']} preguntas, requiere {g['minimo_requerido']}.")
            
        return report

if __name__ == '__main__':
    agent = KnowledgeGapAgent()
    agent.analyze_gaps()
