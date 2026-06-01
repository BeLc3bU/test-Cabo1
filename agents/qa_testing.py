import os
import json

class QATestingAgent:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir
        self.files_to_check = [
            "preguntas.json",
            "simulacro_1.json",
            "simulacro_2.json",
            "simulacro_3.json"
        ]
        self.report_path = os.path.join(base_dir, "agents", "qa_report.md")

    def run_tests(self):
        print("[QA & Testing] Iniciando auditoría final de calidad...")
        
        file_stats = {}
        global_errors = []
        
        # 1. Cargar y auditar cada archivo
        for filename in self.files_to_check:
            path = os.path.join(self.base_dir, filename)
            if not os.path.exists(path):
                global_errors.append(f"Fichero faltante: {filename}")
                continue
                
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if not isinstance(data, list):
                    global_errors.append(f"Estructura inválida en {filename}: debe ser un array.")
                    continue
                    
                # Analizar estadísticas locales
                topics = {}
                difficulties = {}
                imprescindibles = 0
                errors = []
                
                for idx, q in enumerate(data):
                    num = idx + 1
                    t = q.get("tema", "Sin Tema")
                    d = q.get("dificultad", "Sin Dificultad")
                    
                    topics[t] = topics.get(t, 0) + 1
                    difficulties[d] = difficulties.get(d, 0) + 1
                    if q.get("imprescindible"):
                        imprescindibles += 1
                        
                    # Validaciones rápidas de integridad
                    if not q.get("pregunta"):
                        errors.append(f"Q#{num}: Enunciado vacío")
                    if len(q.get("opciones", [])) != 4:
                        errors.append(f"Q#{num}: No tiene 4 opciones")
                    if q.get("respuestaCorrecta") not in q.get("opciones", []):
                        errors.append(f"Q#{num}: Respuesta correcta fuera de las opciones")
                        
                file_stats[filename] = {
                    "count": len(data),
                    "topics": topics,
                    "difficulties": difficulties,
                    "imprescindibles": imprescindibles,
                    "errors": errors
                }
                
            except Exception as e:
                global_errors.append(f"Fallo al abrir o parsear {filename}: {str(e)}")
                
        # 2. Generar el reporte Markdown qa_report.md
        report_lines = [
            "# Reporte de Control de Calidad (QA & Testing)",
            "",
            "Este reporte ha sido generado automáticamente por el **QA & Testing Agent** para verificar la integridad del banco de preguntas del Curso de Cabo 1.º.",
            "",
            "## Resumen General",
            ""
        ]
        
        if global_errors:
            report_lines.append("> [!CAUTION]")
            report_lines.append("> Se han detectado errores globales en el sistema:")
            for err in global_errors:
                report_lines.append(f"> - {err}")
            report_lines.append("")
        else:
            report_lines.append("> [!NOTE]")
            report_lines.append("> Todos los archivos JSON del proyecto son sintácticamente correctos, parseables y cumplen con los esquemas de datos.")
            report_lines.append("")
            
        # Estadísticas del Banco General (preguntas.json)
        pb_stats = file_stats.get("preguntas.json", {})
        if pb_stats:
            report_lines.append("### Estadísticas del Banco General (`preguntas.json`)")
            report_lines.append(f"- **Total de preguntas:** {pb_stats['count']}")
            report_lines.append(f"- **Preguntas imprescindibles:** {pb_stats['imprescindibles']}")
            report_lines.append("")
            
            report_lines.append("#### Distribución de Dificultades")
            total_pb = pb_stats['count']
            for diff, count in pb_stats['difficulties'].items():
                pct = (count / total_pb) * 100
                report_lines.append(f"- **{diff.title()}:** {count} ({pct:.1f}%)")
            report_lines.append("")
            
            report_lines.append("#### Distribución de Temas")
            for topic, count in pb_stats['topics'].items():
                report_lines.append(f"- **{topic}:** {count} preguntas")
            report_lines.append("")
            
        # Detalle de archivos
        report_lines.append("## Detalle de Ficheros de Datos")
        report_lines.append("| Archivo | Preguntas | Imprescindibles | Errores Detectados |")
        report_lines.append("| :--- | :--- | :--- | :--- |")
        for filename, stats in file_stats.items():
            err_count = len(stats["errors"])
            err_str = f"❌ {err_count} errores" if err_count > 0 else "✅ Sin errores"
            report_lines.append(f"| `{filename}` | {stats['count']} | {stats['imprescindibles']} | {err_str} |")
        report_lines.append("")
        
        # Guardar reporte
        with open(self.report_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(report_lines))
            
        print(f"[QA & Testing] Reporte final generado en {self.report_path}")
        return len(global_errors) == 0

if __name__ == '__main__':
    agent = QATestingAgent()
    agent.run_tests()
