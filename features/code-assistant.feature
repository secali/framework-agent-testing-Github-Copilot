# ─────────────────────────────────────────────────────────────
# Ejemplo: Validar capacidades de un agente de código
# ─────────────────────────────────────────────────────────────

Feature: Code Assistant - Basic Capabilities
  Validates that the code assistant agent correctly generates,
  explains, and refactors code when prompted.

  Background:
    Given the agent uses the "mock" adapter
    Given the mock responds to "hello world.*python" with:
      """
      Here's a Hello World function in Python:
      ```python
      def hello_world():
          print("Hello, World!")
      ```
      """
    Given the mock responds to "explain.*add" with:
      """
      This function takes two parameters `a` and `b` and returns 
      their sum using the `+` operator. It's a simple addition function.
      """
    Given the mock responds to "refactor.*loop" with:
      """
      Here's the refactored version using list comprehension:
      ```python
      result = [x * 2 for x in items]
      ```
      """
    Given the mock responds to ".*" with "I can help with that. Could you provide more details?"

  # ─── Code Generation ────────────────────────────────────

  @generation @smoke
  Scenario: Generates hello world in Python
    When I send the prompt "Generate a hello world function in python"
    Then the response contains "def hello"
    And the response contains "print"
    And the response matches the pattern "```python[\s\S]*```"
    And the response is not empty

  # ─── Code Explanation ───────────────────────────────────

  @explanation
  Scenario: Explains addition function clearly
    When I send the prompt "Explain this: def add(a, b): return a + b"
    Then the response contains "sum"
    And the response does not contain "error"
    And the response has at least 10 words

  # ─── Code Refactoring ──────────────────────────────────

  @refactoring
  Scenario: Refactors loop to list comprehension
    When I send the prompt "Refactor this loop to use list comprehension"
    Then the response matches the pattern "\[.*for.*in.*\]"
    And the response contains "comprehension"

  # ─── Edge Cases ────────────────────────────────────────

  @edge-case
  Scenario: Handles ambiguous requests gracefully
    When I send the prompt "Do the thing"
    Then the response does not contain "error"
    And the response contains "more details"
    And the response is not empty
