import os
import sys

# Asegurar que el directorio de agentes esté en el path de búsqueda de Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from material_analyzer import MaterialAnalyzer
from question_generator import QuestionGenerator
from validation import ValidationAgent
from difficulty_calibration import DifficultyCalibrationAgent
from duplicate_detection import DuplicateDetectionAgent
from knowledge_gap import KnowledgeGapAgent
from exam_builder import ExamBuilderAgent
from qa_testing import QATestingAgent

class Orchestrator:
    def __init__(self, base_dir="c:/Proyectos/testCabo1"):
        self.base_dir = base_dir

    def run_pipeline(self):
        print("==================================================")
        print("  INICIANDO PIPELINE MULTIAGENTE - CURSO CABO 1.º ")
        print("==================================================")
        
        # 1. Material Analyzer Agent
        analyzer = MaterialAnalyzer(self.base_dir)
        analyzer.analyze()
        
        # 2. Question Generator Agent
        generator = QuestionGenerator(self.base_dir)
        generator.generate()
        
        # 3. Validation Agent
        validator = ValidationAgent(self.base_dir)
        validator.validate()
        
        # 4. Difficulty Calibration Agent
        calibrator = DifficultyCalibrationAgent(self.base_dir)
        calibrator.calibrate()
        
        # 5. Duplicate Detection Agent
        deduplicator = DuplicateDetectionAgent(self.base_dir)
        deduplicator.detect_and_merge()
        
        # 6. Knowledge Gap Agent
        gap_agent = KnowledgeGapAgent(self.base_dir)
        gap_agent.analyze_gaps()
        
        # 7. Exam Builder Agent
        builder = ExamBuilderAgent(self.base_dir)
        builder.build_exams()
        
        # 8. QA & Testing Agent
        qa_agent = QATestingAgent(self.base_dir)
        success = qa_agent.run_tests()
        
        print("==================================================")
        if success:
            print("  PIPELINE FINALIZADO CON ÉXITO Y BANCO ACTUALIZADO ")
        else:
            print("  PIPELINE COMPLETADO CON ADVERTENCIAS / ERRORES DE QA")
        print("==================================================")
        return success

if __name__ == '__main__':
    orchestrator = Orchestrator()
    orchestrator.run_pipeline()
