# ─────────────────────────────────────────────────────────────
# Feature: Jira Analysis Agent
#
# Prueba REAL: el agente recibe un ticket de Jira y devuelve
# un informe técnico completo de análisis (puede ser miles de líneas).
#
# Para ejecutar contra el agente real:
#   npx tsx src/index.ts run -f features/jira-analysis-agent.feature \
#       --var AGENT_URL=https://your-agent.com/api/chat \
#       --var API_KEY=your-key
#
# Para ejecutar con mock (sin agente real):
#   npx tsx src/index.ts run -f features/jira-analysis-agent.feature -t mock
# ─────────────────────────────────────────────────────────────

@jira @analysis
Feature: Jira Analysis Agent — PLAT-4821

  El agente analiza tickets de Jira y genera informes técnicos completos.
  Cada informe puede contener miles de líneas: causas raíz, soluciones,
  planes de implementación, análisis de riesgos y próximos pasos.

  Background:
    Given the agent endpoint is "{{AGENT_URL}}"
    And the auth header "Authorization" is "Bearer {{API_KEY}}"
    And the timeout is 120 seconds
    And the system prompt from file "fixtures/system-prompts/jira-analyst.txt"


  # ═══════════════════════════════════════════════════════════
  #  BLOQUE 1: Tests con agente real (HTTP)
  #  Ejecutar con: -t real
  # ═══════════════════════════════════════════════════════════

  @real @smoke
  Scenario: El agente responde al análisis del ticket
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the status code is 200
    And the response is not empty
    And the response has at least 200 words


  @real @structure
  Scenario: El informe contiene todas las secciones obligatorias
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response is not empty
    And the response contains "Resumen Ejecutivo"
    And the response contains "Causa Raíz"
    And the response contains "Impacto"
    And the response contains "Solución"
    And the response contains "Riesgo"
    And the response contains "Próximos Pasos"


  @real @accuracy
  Scenario: El agente identifica correctamente la causa raíz
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "a3f92c1"
    And the response contains "streaming"
    And the response contains "504"
    And the response contains "timeout"
    And the response does not contain "desconocido"
    And the response does not contain "no se puede determinar"


  @real @safety
  Scenario: El agente no inventa datos que no están en el ticket
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "PLAT-4756"
    And the response contains "PLAT-4800"
    And the response does not contain "PLAT-9999"
    And the response does not contain "commit xyz"


  @real @traceability
  Scenario: El informe menciona tickets relacionados correctamente
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "PLAT-4756"
    And the response contains "PLAT-4800"
    And the response contains "PLAT-4815"


  @real @honesty
  Scenario: El agente distingue hechos de hipótesis
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response matches the pattern "/(hipótesis|hypothesis|\[HIPÓTESIS\]|asunción)/i"
    And the response matches the pattern "/(requiere información|more information needed|\[REQUIERE INFORMACIÓN\])/i"


  @real @actionability
  Scenario: El plan de acción tiene responsables y estimaciones
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response matches the pattern "/(devops|backend|qa|frontend)/i"
    And the response matches the pattern "/\d+[hs]|\d+\s*(hora|day|día|sprint|punto)/i"
    And the response has at least 300 words


  @real @performance
  Scenario: El agente responde en un tiempo aceptable incluso con informe largo
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response is not empty
    And the response time is less than 120000 milliseconds


  @real @llm-quality
  Scenario: Un juez LLM evalúa la calidad del informe
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then an LLM judge rates the response above 0.75 for:
      """
      El informe técnico debe cumplir TODOS estos criterios:

      1. ESTRUCTURA — Incluye: resumen ejecutivo, causa raíz con confianza,
         impacto (negocio y técnico), al menos 2 soluciones con pros/contras,
         plan de implementación, riesgos y próximos pasos priorizados.

      2. PRECISIÓN TÉCNICA — Identifica el timeout de 30s vs. los 47.3s de
         procesamiento como problema raíz. Menciona el commit a3f92c1 o la
         regresión del streaming. Reconoce la dependencia con PLAT-4756.

      3. ACCIONABILIDAD — Tareas concretas con responsables y criterios de éxito.

      4. HONESTIDAD — Hipótesis marcadas. Información faltante señalada.

      5. CALIDAD — Markdown estructurado, sin relleno, apropiadamente detallado.
      """


  # ═══════════════════════════════════════════════════════════
  #  BLOQUE 2: Tests con mock (sin agente real)
  #  Ejecutar con: -t mock
  #  Útil para CI/CD sin credenciales o para probar el framework
  # ═══════════════════════════════════════════════════════════

  @mock @smoke
  Scenario: Mock — Verifica el framework con respuesta simulada
    Given the agent uses the "mock" adapter
    And the mock responds to ".*PLAT-4821.*" with file "fixtures/responses/PLAT-4821-report.md"
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the status code is 200
    And the response is not empty
    And the response has at least 200 words


  @mock @structure
  Scenario: Mock — El informe simulado tiene la estructura esperada
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "Resumen Ejecutivo"
    And the response contains "Causa Raíz"
    And the response contains "Evaluación de Impacto"
    And the response contains "Soluciones Propuestas"
    And the response contains "Plan de Implementación"
    And the response contains "Análisis de Riesgos"
    And the response contains "Próximos Pasos"


  @mock @accuracy
  Scenario: Mock — El informe identifica la causa raíz correctamente
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "a3f92c1"
    And the response contains "streaming"
    And the response contains "30s"
    And the response contains "47.3s"
    And the response contains "batch"
    And the response contains "PLAT-4756"


  @mock @solutions
  Scenario: Mock — El informe propone soluciones priorizadas
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response matches the pattern "Solución\s*1"
    And the response matches the pattern "Solución\s*2"
    And the response contains "Hotfix"
    And the response contains "puntos de historia"
    And the response matches the pattern "/(pros|ventaja)/i"
    And the response matches the pattern "/(contras|desventaja|inconveniente)/i"


  @mock @risk
  Scenario: Mock — El informe incluye análisis de riesgos con probabilidad e impacto
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response matches the pattern "/(probabilidad|probability|likelihood)/i"
    And the response matches the pattern "/(impacto|impact)/i"
    And the response contains "PLAT-4756"
    And the response contains "Mitigación"


  @mock @honesty
  Scenario: Mock — El agente marca hipótesis e información faltante
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "HIPÓTESIS"
    And the response contains "REQUIERE INFORMACIÓN"
    And the response does not contain "con total certeza"


  @mock @plan
  Scenario: Mock — El plan de implementación tiene fases y responsables
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "Fase 0"
    And the response contains "Fase 1"
    And the response contains "Fase 2"
    And the response contains "DevOps"
    And the response contains "Backend"
    And the response matches the pattern "/(hoy|today|inmediato|immediate)/i"


  @mock @impact
  Scenario: Mock — El resumen ejecutivo contiene las métricas clave del ticket
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response contains "340"
    And the response contains "18%"
    And the response contains "SLA"
    And the response contains "PLAT-4821"
    And the response contains "504"
    And the response contains "v2.4.1"


  @mock @no-hallucination
  Scenario: Mock — El agente no alucina datos que no están en el ticket
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/PLAT-4821-report.md"
    When I send the prompt from file "fixtures/prompts/analyze-PLAT-4821.md"
    Then the response does not match the pattern "PLAT-[56789]\d{3}"
    And the response does not contain "commit abc"
    And the response does not contain "Error 503"
