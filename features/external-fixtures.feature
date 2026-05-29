# ─────────────────────────────────────────────────────────────
# Ejemplo: Features limpias usando archivos externos (fixtures)
# ─────────────────────────────────────────────────────────────
#
# Este feature demuestra cómo mantener los tests legibles
# externalizando contenido pesado a fixtures/.

Feature: Code Review Agent — External Fixtures
  Demonstrates the file-based steps for clean, readable features.
  All large text blocks live in fixtures/ instead of inline.

  Background:
    Given the agent uses the "mock" adapter
    Given the system prompt from file "fixtures/system-prompts/code-reviewer.txt"

  @smoke @fixtures
  Scenario: Reviews code loaded from file
    Given the mock responds to ".*" with file "fixtures/responses/security-review-expected.md"
    When I send the prompt from file "fixtures/prompts/security-review.md"
    Then the response is not empty
    And the response contains "SQL Injection"
    And the response contains "Path Traversal"
    And the response contains "Weak Hashing"
    And the response has at least 50 words
    And the response matches the content of file "fixtures/responses/security-review-expected.md"

  @fixtures
  Scenario: Response contains expected code fix
    Given the mock responds to ".*" with file "fixtures/responses/security-review-expected.md"
    When I send the prompt "Review get_user function for security"
    Then the response contains "parameterized"
    And the response matches the pattern "cursor\.execute\(.+\?"
    And the response does not contain "eval("
