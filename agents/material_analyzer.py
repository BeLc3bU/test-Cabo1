import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET

class MaterialAnalyzer:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.temario_dir = os.path.join(base_dir, "nuevomaterial", "Temario")
        self.nuevomaterial_dir = os.path.join(base_dir, "nuevomaterial")
        
    def get_docx_text(self, file_path):
        try:
            with zipfile.ZipFile(file_path) as docx:
                xml_content = docx.read('word/document.xml')
                root = ET.fromstring(xml_content)
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in root.findall('.//w:p', ns):
                    text_runs = p.findall('.//w:t', ns)
                    text = "".join([t.text for t in text_runs if t.text])
                    if text.strip():
                        paragraphs.append(text.strip())
                return "\n".join(paragraphs)
        except Exception as e:
            print(f"Error leyendo {file_path}: {e}")
            return ""

    def analyze(self):
        print("[Material Analyzer] Analizando material de estudio...")
        thematic_map = {}
        
        # 1. Analizar documentos de Temario
        if os.path.exists(self.temario_dir):
            files = os.listdir(self.temario_dir)
            for file in files:
                if file.endswith('.docx'):
                    full_path = os.path.join(self.temario_dir, file)
                    text = self.get_docx_text(full_path)
                    
                    # Extraer título del archivo o primeras líneas
                    topic_name = file.replace(".docx", "").strip()
                    # Quitar números iniciales como "1.DINAMICA DE GRUPO"
                    topic_clean = re.sub(r'^\d+[\.\s]*-?\s*', '', topic_name).strip()
                    topic_norm = self.normalize_topic(topic_clean)
                    
                    # Detectar conceptos clave (frases destacadas, palabras en mayúsculas o secciones)
                    # En este caso, buscaremos títulos principales en el texto
                    lines = text.split('\n')
                    subtopics = []
                    keywords = []
                    
                    for line in lines[:30]: # Examinar las primeras líneas para subtemas
                        line_clean = line.strip()
                        if len(line_clean) > 3 and len(line_clean) < 60 and (line_clean.isupper() or re.match(r'^\d+\.\s+[A-Z]', line_clean)):
                            subtopics.append(line_clean)
                            
                    # Búsqueda de palabras clave normativas
                    laws = list(set(re.findall(r'\b(?:L\.?\s*O\.?|Ley|Instrucción|I\.?\s*G\.?)\s+\d+/\d+(?:\s+de\s+\d+\s+de\s+\w+)?\b|\bI\.?\s*G\.?\s+\d+-\d+\b', text, re.IGNORECASE)))
                    
                    # Si ya existe el tema (ej: por dos archivos distintos), fusionar o añadir
                    if topic_norm not in thematic_map:
                        thematic_map[topic_norm] = {
                            "archivo_origen": [file],
                            "subtemas": subtopics[:10],
                            "normativas_detectadas": laws,
                            "longitud_caracteres": len(text),
                            "nivel_importancia": "Crítico" if len(laws) > 0 or "VALORES" in topic_clean or "LIDERAZGO" in topic_clean else "Relevante"
                        }
                    else:
                        thematic_map[topic_norm]["archivo_origen"].append(file)
                        thematic_map[topic_norm]["subtemas"] = list(set(thematic_map[topic_norm]["subtemas"] + subtopics[:10]))
                        thematic_map[topic_norm]["normativas_detectadas"] = list(set(thematic_map[topic_norm]["normativas_detectadas"] + laws))
                        thematic_map[topic_norm]["longitud_caracteres"] += len(text)
        
        # 2. Guardar mapa temático en disco
        output_path = os.path.join(self.base_dir, "agents", "thematic_map.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(thematic_map, f, ensure_ascii=False, indent=2)
            
        print(f"[Material Analyzer] Mapa temático generado con {len(thematic_map)} temas en {output_path}")
        return thematic_map

    def normalize_topic(self, topic):
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

if __name__ == '__main__':
    analyzer = MaterialAnalyzer()
    analyzer.analyze()
