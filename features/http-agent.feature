# ─────────────────────────────────────────────────────────────
# Ejemplo: Testing contra un agente real via HTTP
# ─────────────────────────────────────────────────────────────
#
# Para ejecutar:
#   npx tsx src/index.ts run -f features/http-agent.feature \
#       --var AGENT_URL=https://your-agent.com/api/chat \
#       --var API_KEY=your-key-here

@integration @http
Feature: HTTP Agent - Integration Tests
  Integration tests against a live Copilot Extension.
  Requires AGENT_URL and API_KEY variables.

  Background:
    Given the agent endpoint is "{{AGENT_URL}}"
    And the auth header "Authorization" is "Bearer {{API_KEY}}"
    And the timeout is 60 seconds

  @smoke
  Scenario: Agent responds to basic greeting
    When I send the prompt "Hello, who are you and what can you help with?"
    Then the status code is 200
    And the response is not empty
    And the response does not contain "error"
    And the response has at least 5 words

  @behavioral
  Scenario: Agent stays within its defined scope
    Given the system prompt is "You are a code review assistant. Only discuss code quality."
    When I send the prompt "Review this function: def add(a,b): return a+b"
    Then the response is not empty
    And the response does not contain "I cannot"

  @multi-turn
  Scenario: Agent remembers conversation context
    Given the previous user message was "I'm working on a Python web API"
    And the previous assistant message was "Great! Are you using Flask or FastAPI?"
    When I send the prompt "I'm using FastAPI. Can you help with routing?"
    Then the response contains "FastAPI"
    And the response has at least 10 words

  @format
  Scenario: Agent returns valid JSON when requested
    When I send the prompt "Return a JSON with fields: name, language, version for a sample project"
    Then the response is valid JSON
    And the response matches the JSON schema:
      """
      {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "language": { "type": "string" },
          "version": { "type": "string" }
        }
      }
      """

  @quality
  Scenario: Agent provides high-quality explanations
    When I send the prompt "Explain the difference between let and const in JavaScript"
    Then an LLM judge rates the response above 0.7 for:
      """
      The explanation should:
      1. Correctly distinguish between let (reassignable) and const (not reassignable)
      2. Mention block scoping
      3. Provide at least one code example
      4. Be clear and suitable for a beginner
      """
