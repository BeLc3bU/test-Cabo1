# Curso de Cabo 1.º - Aplicación de Cuestionarios PWA y Pipeline Multiagente

Una Aplicación Web Progresiva (PWA) instalable y de funcionamiento offline, diseñada específicamente para la preparación del **Curso de Actualización para Cabo 1.º del Ejército del Aire**.

La aplicación incorpora una **arquitectura multiagente especializada** para la extracción, generación, calibración de dificultad, validación sintáctica, deduplicación semántica y distribución balanceada de las preguntas a partir del material de estudio oficial.

---

## ✨ Características de la Aplicación

- **2 Modos de Práctica Principales**:
  - **Test Normal Configurable**: Cuestionarios dinámicos con un número de preguntas configurable (10, 20, 30, 50 o 100). Utiliza un **algoritmo de muestreo estratificado proporcional por temas** para asegurar que los 11 temas del curso estén representados proporcionalmente de acuerdo con el volumen restante de preguntas no vistas en el pool general.
  - **Repaso de Fallos**: Permite repasar exclusivamente las preguntas respondidas incorrectamente en sesiones anteriores de forma interactiva y persistente.
- **Simulacros de Examen**: 
  - **3 simulacros de 30 preguntas** cada uno con conjuntos cerrados de preguntas únicas sin solapamiento.
  - Sistema de calificación formal **APTO / NO APTO** en base a una nota final sobre 100 calculada de forma proporcional (cada fallo resta `0.33` puntos, requiriendo un mínimo de `50.00 / 100` para ser APTO).
- **Funcionalidad Offline y PWA**:
  - Instalable en dispositivos móviles y de escritorio.
  - Funciona de forma 100% offline gracias a un **Service Worker** con estrategia de caché *Stale-While-Revalidate*.
- **Persistencia Local Segura**:
  - Usa `LocalStorage` con claves específicas del curso (`testCabo1*`) para prevenir colisiones o mezclas con versiones o configuraciones obsoletas.
  - Permite guardar y restaurar tests no finalizados automáticamente al recargar.
- **Micro-interacciones y Accesibilidad**:
  - Feedback háptico (vibración en móviles) y auditivo para aciertos/errores, con control de silencio.
  - Soporte de atajos de teclado (`A/1`, `B/2`, `C/3`, `D/4`) para una navegación ultra rápida.
  - Soporte nativo para temas claro y oscuro.

---

## 🤖 Arquitectura Multiagente (Pipeline de Datos)

El banco de preguntas se mantiene y regenera automáticamente a partir del contenido de `/nuevomaterial` (temarios en `.docx` y tests de muestra en `.html`) a través de un pipeline multiagente implementado en Python y Node.js.

### Subagentes Especializados (`.skills/` y `agents/`):
1. **Orquestador Principal** (`orchestrator.py`): Controla el flujo secuencial de ejecución del pipeline.
2. **Analizador de Material** (`material_analyzer.py`): Procesa el temario teórico oficial en docx y genera el mapa de cobertura temática (`thematic_map.json`).
3. **Generador de Preguntas** (`html_extractor.js` y `question_generator.py`): Extrae preguntas de autoevaluaciones oficiales y genera variantes del temario.
4. **Validador de Estructura** (`validation.py`): Filtra y corrige errores lógicos, sintácticos o de formato en las preguntas.
5. **Calibrador de Dificultad** (`difficulty_calibration.py`): Asigna y calibra la dificultad de las preguntas para cumplir la meta del ratio: **30% Fáciles, 50% Medias y 20% Difíciles**.
6. **Detector de Duplicados** (`duplicate_detection.py`): Deduplica preguntas idénticas y similitudes semánticas (mediante similitud Jaccard de n-gramas >85%).
7. **Analizador de Lagunas de Conocimiento** (`knowledge_gap.py`): Evalúa la cobertura mínima del banco de preguntas por cada tema.
8. **Constructor de Exámenes** (`exam_builder.py`): Empaqueta el pool de 292 preguntas únicas en `preguntas.json` y genera los 3 simulacros balanceados de 30 preguntas cada uno.
9. **QA & Testing** (`qa_testing.py`): Ejecuta pruebas de integración sobre los JSONs finales y compila el reporte de calidad `qa_report.md`.

Para ejecutar todo el pipeline de agentes en local:
```bash
python agents/orchestrator.py
```

---

## 🚀 Tecnologías Utilizadas

- **Frontend (Web App)**:
  - **HTML5** semántico y accesible.
  - **CSS3** responsivo con variables de theming (Claro/Oscuro), transiciones y animaciones.
  - **JavaScript (ES Modules)**: Modularización pura de estado, interfaz y utilidades.
  - **PWA**: Service Worker para caché offline y archivo `manifest.json` depurado.
- **Backend (Pipeline de Contenido)**:
  - **Python 3.x**: Scripts del pipeline de agentes, manipulación de archivos y deduplicación.
  - **Node.js**: Script extractor de preguntas HTML.

---

## 🔧 Instalación y Uso Local

1. **Clonar el repositorio** a tu espacio local.
2. **Levantar un servidor local**:
   Debido a las políticas de seguridad (CORS) de los navegadores modernos para módulos de JavaScript y Service Workers, **no se debe abrir el archivo `index.html` directamente**. Debe ser servido a través de un servidor HTTP local.
   
   - **Usando Node.js (Recomendado)**:
     ```bash
     npx http-server -c-1
     ```
   - **Usando Python**:
     ```bash
     python -m http.server 8000
     ```
3. Accede en tu navegador a la dirección provista en la terminal (ej. `http://localhost:8080` o `http://localhost:8000`).

---

## 📂 Estructura de Archivos

```
├── 📁 .skills/               # Especificaciones funcionales de los agentes (Skills.sh)
├── 📁 agents/                # Scripts del pipeline multiagente (Python/JS) y reportes de QA
├── 📁 icons/                 # Iconos de la PWA
├── 📁 screenshots/           # Capturas de pantalla de la PWA (para instalación)
├── 📁 sounds/                # Efectos de audio (acierto/fallo)
├── 📜 app.js                 # Lógica de inicio y escuchas de eventos de la aplicación
├── 📜 index.html              # Estructura del cliente PWA
├── 📜 manifest.json          # Metadatos e instalación de la PWA
├── 📜 preguntas.json          # Pool general unificado de 292 preguntas únicas
├── 📜 questionManager.js     # Gestión de carga y deduplicación de preguntas en cliente
├── 📜 README.md              # Este archivo
├── 📜 service-worker.js      # Sincronización periódica y almacenamiento offline
├── 📜 simulacro_1.json       # Preguntas del Simulacro 1 (30 preguntas)
├── 📜 simulacro_2.json       # Preguntas del Simulacro 2 (30 preguntas)
├── 📜 simulacro_3.json       # Preguntas del Simulacro 3 (30 preguntas)
├── 📜 state.js               # Gestor del estado, sesiones y muestreo estratificado
├── 📜 storage.js             # Envoltorio persistente para localStorage (CursoCabo1)
└── 📜 style.css              # Sistema de diseño, variables y estilos responsivos
```

---
*Desarrollado con fines educativos y de preparación para el Curso de Actualización para Cabo 1.º del Ejército del Aire.*