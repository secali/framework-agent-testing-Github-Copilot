# ─────────────────────────────────────────────────────────────
# Feature: QA Methodology Agent
#
# Prueba REAL: el agente de metodología de QA recibe requisitos
# y diseña una estrategia de pruebas, casos de prueba BDD y
# detecta vacíos conceptuales en las especificaciones.
#
# Para ejecutar contra el agente real:
#   npx tsx src/index.ts run -f features/qa-methodology-agent.feature \
#       --var AGENT_URL=https://your-agent.com/api/chat \
#       --var API_KEY=your-key
#
# Para ejecutar con mock (sin agente real):
#   npx tsx src/index.ts run -f features/qa-methodology-agent.feature -t mock
# ─────────────────────────────────────────────────────────────

@qa @methodology
Feature: QA Methodology Agent — Payment Splitter

  El agente de metodología QA analiza requisitos técnicos y funcionales,
  generando estrategias de prueba integrales, casos de prueba BDD en formato Gherkin
  y detectando vacíos conceptuales (Gaps) en la definición de negocio.

  Background:
    Given the agent endpoint is "{{AGENT_URL}}"
    And the auth header "Authorization" is "Bearer {{API_KEY}}"
    And the timeout is 60 seconds
    And the system prompt from file "fixtures/system-prompts/qa-methodology.txt"


  # ═══════════════════════════════════════════════════════════
  #  BLOQUE 1: Tests con agente real (HTTP)
  #  Ejecutar con: -t real
  # ═══════════════════════════════════════════════════════════

  @real @smoke
  Scenario: El agente responde al análisis de los requisitos
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the status code is 200
    And the response is not empty
    And the response has at least 250 words


  @real @structure
  Scenario: El informe de QA contiene las secciones obligatorias
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response is not empty
    And the response contains "Estrategia"
    And the response contains "Casos de Prueba"
    And the response contains "Gherkin"
    And the response contains "Gaps"
    And the response contains "Próximos Pasos"


  @real @accuracy
  Scenario: El agente identifica el problema del redondeo financiero
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "redondeo"
    And the response matches the pattern "/(céntimo|residuo|decimal|moneda)/i"
    And the response matches the pattern "/(3\.33|3\.34)/i"


  @real @bdd-spec
  Scenario: El agente genera escenarios BDD válidos
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response matches the pattern "/(Scenario|Escenario):/i"
    And the response matches the pattern "/(Given|Dado|Given un)/i"
    And the response matches the pattern "/(When|Cuando|When )/i"
    And the response matches the pattern "/(Then|Entonces|Then )/i"


  @real @gaps
  Scenario: El agente identifica vacíos conceptuales en las reglas
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "GAPS"
    And the response matches the pattern "/(aleatorio|auditabilidad|concurrencia|carrera)/i"


  @real @tools
  Scenario: El agente recomienda herramientas modernas de automatización
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response matches the pattern "/(jest|playwright|cypress|k6|vitest)/i"


  # ═══════════════════════════════════════════════════════════
  #  BLOQUE 2: Tests con mock (sin agente real)
  #  Ejecutar con: -t mock
  # ═══════════════════════════════════════════════════════════

  @mock @smoke
  Scenario: Mock — Valida la respuesta del agente QA usando fixture
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the status code is 200
    And the response is not empty
    And the response has at least 300 words


  @mock @structure
  Scenario: Mock — El reporte simulado tiene estructura y nivel de detalle correcto
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "Estrategia de Calidad"
    And the response contains "Casos de Prueba Críticos"
    And the response contains "Especificaciones BDD (Gherkin)"
    And the response contains "Gaps y Ambigüedades"
    And the response contains "Próximos Pasos"


  @mock @financial-math
  Scenario: Mock — El reporte analiza matemáticamente los decimales financieros
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "3.33"
    And the response contains "3.34"
    And the response contains "10.00"
    And the response matches the pattern "/(céntimo|redondeo|residuo)/i"


  @mock @gaps
  Scenario: Mock — El reporte detecta vacíos severos de auditoría y concurrencia
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "GAPS"
    And the response contains "aleatoriedad"
    And the response contains "auditabilidad"
    And the response contains "concurrencia"
    And the response contains "carrera"


  @mock @bdd
  Scenario: Mock — Los escenarios BDD están correctamente formados en Gherkin
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response matches the pattern "Scenario Outline:"
    And the response matches the pattern "Given "
    And the response matches the pattern "When "
    And the response matches the pattern "Then "
    And the response contains "Examples:"


  @mock @tools
  Scenario: Mock — Las recomendaciones de herramientas QA son adecuadas
    Given the agent uses the "mock" adapter
    And the mock responds to ".*" with file "fixtures/responses/payment-split-strategy.md"
    When I send the prompt from file "fixtures/prompts/generate-test-strategy.md"
    Then the response contains "Jest"
    And the response contains "Playwright"
    And the response contains "k6"
    And the response matches the pattern "/(vitest|cucumber)/i"
