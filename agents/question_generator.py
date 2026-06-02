import os
import re
import json
import subprocess
import zipfile
import xml.etree.ElementTree as ET

class QuestionGenerator:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.output_json = os.path.join(base_dir, "agents", "generated_questions.json")
        self.autoeval_path = os.path.join(base_dir, "nuevomaterial", "AUTOEVALUACIÓN.docx")
        
    def run_html_extractor(self):
        try:
            extractor_script = os.path.join(self.base_dir, "agents", "html_extractor.js")
            result = subprocess.run(["node", extractor_script], capture_output=True, text=True, check=True)
            print(result.stdout)
        except Exception as e:
            print(f"[Question Generator] Error ejecutando extractor HTML: {e}")

    def get_docx_text(self, path):
        try:
            with zipfile.ZipFile(path) as docx:
                xml_content = docx.read('word/document.xml')
                root = ET.fromstring(xml_content)
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in root.findall('.//w:p', ns):
                    text_runs = p.findall('.//w:t', ns)
                    text = "".join([t.text for t in text_runs if t.text])
                    paragraphs.append(text)
                return paragraphs
        except Exception as e:
            print(f"[Question Generator] Error leyendo {path}: {e}")
            return []

    def parse_autoevaluacion(self):
        print(f"[Question Generator] Procesando autoevaluación: {self.autoeval_path}")
        if not os.path.exists(self.autoeval_path):
            return []
            
        paragraphs = self.get_docx_text(self.autoeval_path)
        current_topic = "General"
        questions = []
        current_q = None
        
        for p in paragraphs:
            p_clean = p.strip()
            if not p_clean:
                continue
                
            if "AUTOEVALUACIÓN" in p_clean or "AUTOEVALUACI" in p_clean:
                if current_q:
                    questions.append(current_q)
                    current_q = None
                parts = re.split(r'[–-]', p_clean)
                if len(parts) > 1:
                    current_topic = parts[1].strip().title()
                else:
                    current_topic = p_clean.replace("AUTOEVALUACIÓN", "").replace("AUTOEVALUACIÓN", "").strip().strip("–- ").title()
                continue
                
            # Soporta tanto "1." como "Pregunta 1"
            q_match = re.match(r'^(?:Pregunta\s+)?(\d+)[\.\s]+(.*)', p_clean, re.IGNORECASE)
            if q_match:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "pregunta": q_match.group(2).strip(),
                    "opciones": [],
                    "respuestaCorrecta": None,
                    "tema": current_topic,
                    "explicacion": ""
                }
                
                # Checkear si la opción a) está al final del enunciado
                opt_a_match = re.search(r'(.*?)\s+a\)[\s\.]*(.*)', current_q["pregunta"], re.IGNORECASE)
                if opt_a_match:
                    current_q["pregunta"] = opt_a_match.group(1).strip()
                    current_q["opciones"].append(opt_a_match.group(2).strip())
                continue
                
            ans_match = re.match(r'^Respuesta\s+correcta:\s*([a-d])', p_clean, re.IGNORECASE)
            if ans_match and current_q:
                ans_letter = ans_match.group(1).lower()
                current_q["respuestaCorrecta"] = ans_letter
                continue
                
            # Opciones múltiples en la misma línea o individuales
            # Evitamos procesar si es la línea de respuesta correcta
            if not p_clean.lower().startswith("respuesta"):
                opt_line_match = re.findall(r'(?:^|\s+)([a-d])[\)\.]\s*(.*?)(?=\s+[a-d][\)\.]|$)', p_clean, re.IGNORECASE)
                if opt_line_match and current_q:
                    for letter, content in opt_line_match:
                        current_q["opciones"].append(content.strip())
                    continue
                
            if current_q:
                if p_clean.lower().startswith("explicación:") or p_clean.lower().startswith("explicacion:"):
                    current_q["explicacion"] = p_clean.replace("Explicación:", "").replace("Explicacion:", "").strip()
                elif not current_q["respuestaCorrecta"]:
                    if not current_q["opciones"]:
                        current_q["pregunta"] += " " + p_clean
                    else:
                        current_q["opciones"][-1] += " " + p_clean
                else:
                    current_q["explicacion"] += " " + p_clean

        if current_q:
            questions.append(current_q)
            
        # Post-procesar
        valid_questions = []
        for q in questions:
            # Corrección específica para evitar duplicado en la pregunta de Mensajería Formal
            if "Mensajería Formal" in q["pregunta"] and len(q["opciones"]) >= 3:
                if q["opciones"][1] == q["opciones"][2]:
                    q["opciones"][2] = "Su principal cualidad es la economía y sencillez del medio empleado para su transmisión"

            if q["respuestaCorrecta"] in ['a', 'b', 'c', 'd']:
                idx = ord(q["respuestaCorrecta"]) - ord('a')
                if idx < len(q["opciones"]):
                    q["respuestaCorrecta"] = q["opciones"][idx]
            
            # Limpiar opciones vacías
            q["opciones"] = [o.strip() for o in q["opciones"] if o.strip()]
            valid_questions.append(q)
            
        return valid_questions

    def normalize_topic(self, topic):
        import re
        t = topic.lower().strip()
        if re.search(r'internacionales|onu|otan|\bt\.?1\b', t):
            return "Organizaciones Internacionales"
        elif re.search(r'psicol|\bt\.?2\b', t):
            return "Apoyo Psicológico"
        elif re.search(r'aéreo|aereo|\bt\.?3\b', t):
            return "Material Aéreo"
        elif re.search(r'historia|\bt\.?4\b', t):
            return "Historia del EA"
        elif re.search(r'grupo|\bt\.?5\b', t):
            return "Dinámica de Grupos"
        elif re.search(r'oral|\bt\.?6\b', t):
            return "Expresión Oral"
        elif re.search(r'escrita|\bt\.?7\b', t):
            return "Expresión Escrita"
        elif re.search(r'liderazgo|\bt\.?8\b', t):
            return "Liderazgo"
        elif re.search(r'valores|\bt\.?9\b', t):
            return "Valores Militares"
        elif re.search(r'registro|utilización de documentos|apoyo.*documentos|técnicas de apoyo|tecnicas de apoyo|10-01|\bt\.?10\b', t):
            return "Registro y Redacción de Documentos"
        elif re.search(r'redacción|redaccion|\bt\.?11\b', t):
            return "Redacción de Documentos Militares"
        return "General"

    def generate(self):
        print("[Question Generator] Iniciando generación de preguntas...")
        
        # 1. Ejecutar extractor de HTML
        self.run_html_extractor()
        
        # 2. Cargar preguntas de HTML
        html_questions = []
        html_json_path = os.path.join(self.base_dir, "agents", "extracted_html_questions.json")
        if os.path.exists(html_json_path):
            with open(html_json_path, 'r', encoding='utf-8') as f:
                html_questions = json.load(f)
        
        # 3. Cargar preguntas de Docx (Autoevaluación)
        docx_questions = self.parse_autoevaluacion()
        
        # 3.b Cargar preguntas adicionales (de temas con baja cobertura)
        extra_questions = []
        extra_json_path = os.path.join(self.base_dir, "agents", "extra_questions.json")
        if os.path.exists(extra_json_path):
            with open(extra_json_path, 'r', encoding='utf-8') as f:
                extra_questions = json.load(f)
            print(f"[Question Generator] Cargadas {len(extra_questions)} preguntas adicionales.")

        # 4. Fusionar todo y normalizar temas
        all_questions = []
        for q in (html_questions + docx_questions + extra_questions):
            q["tema"] = self.normalize_topic(q["tema"])
            all_questions.append(q)
            
        print(f"[Question Generator] Fusionadas {len(all_questions)} preguntas de entrada.")
        
        # 5. Generación de variantes programáticas para aumentar robustez del banco
        # Desactivado temporalmente para evitar preguntas duplicadas redundantes.
        # variants = []
        # for idx, q in enumerate(all_questions):
        #     if len(variants) >= 50:  # Generar hasta 50 variantes útiles
        #         break
        #     # Generar variante por orden inverso de opciones
        #     if len(q["opciones"]) == 4 and idx % 7 == 0:
        #         rev_opts = list(reversed(q["opciones"]))
        #         variants.append({
        #             "pregunta": f"{q['pregunta']} (Variante)",
        #             "opciones": rev_opts,
        #             "respuestaCorrecta": q["respuestaCorrecta"],
        #             "tema": q["tema"],
        #             "explicacion": q["explicacion"]
        #         })
        # 
        # all_questions.extend(variants)
        
        # 6. Escribir resultado
        with open(self.output_json, 'w', encoding='utf-8') as f:
            json.dump(all_questions, f, ensure_ascii=False, indent=2)
            
        print(f"[Question Generator] Base de preguntas consolidada con {len(all_questions)} preguntas guardada en {self.output_json}")
        return all_questions

if __name__ == '__main__':
    generator = QuestionGenerator()
    generator.generate()
