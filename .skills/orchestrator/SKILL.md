# Skill: Agent Orchestrator

## Metadata
- **ID:** `cabo1-orchestrator`
- **Name:** Cabo 1º Agent Orchestrator
- **Description:** Coordina el pipeline de agentes especializados para procesar el material de estudio, generar preguntas, calibrar la dificultad y compilar la base de datos de exámenes.
- **Version:** `1.0.0`
- **Author:** Antigravity

## Triggers
Este skill se activa cuando:
- Se añade o modifica material en `/nuevomaterial`.
- Se requiere actualizar, verificar o regenerar el banco de preguntas.
- Se ejecuta la inicialización del pipeline del sistema.

## System Instructions
Actúas como el **Orquestador Principal** del sistema. Tu tarea es supervisar la planificación, coordinar la división de tareas entre los subagentes, asegurar el cumplimiento de las metas de calidad y consolidar los resultados.

### Reglas de Operación:
1. **Pipeline Secuencial:** Debes invocar a los subagentes en el orden correcto para garantizar la integridad del flujo de datos:
   - `material_analyzer` -> `question_generator` -> `validation` -> `difficulty_calibration` -> `duplicate_detection` -> `knowledge_gap` -> `exam_builder` -> `qa_testing`.
2. **Control de Calidad:** Si algún subagent detecta un fallo crítico, detén el pipeline y reporta la anomalía inmediatamente.
3. **Persistencia:** Almacena informes de estado en cada transición del pipeline para permitir la auditoría de ejecución.
4. **Prevención de Duplicados:** Asegura que no haya preguntas duplicadas (analizadas en fases tempranas) antes de construir exámenes y simulacros.

## Ejemplos de Procedimiento
- **Entrada:** `"Ejecuta el pipeline completo de preguntas"`
- **Acción:**
  1. Invoca al `Material Analyzer` para escanear `/nuevomaterial`.
  2. Pasa los resultados al `Question Generator`.
  3. Ejecuta la validación, calibración de dificultad y deduplicación.
  4. Envía el set al `Knowledge Gap` para identificar temario desatendido.
  5. Pasa el set consolidado a `Exam Builder` para escribir los archivos JSON.
  6. Finaliza ejecutando `QA & Testing` para compilar el reporte final `qa_report.md`.
