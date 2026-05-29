# ─────────────────────────────────────────────────────────────
# Ejemplo: Conversaciones multi-turno y Scenario Outline
# ─────────────────────────────────────────────────────────────

Feature: Multi-turn Conversations & Outline
  Tests that the agent handles conversation context and
  demonstrates Scenario Outline for parameterized tests.

  Background:
    Given the agent uses the "mock" adapter

  # ─── Multi-turn ────────────────────────────────────────

  @multi-turn
  Scenario: Maintains context across turns
    Given the previous user message was "Help me deploy a Node.js app"
    And the previous assistant message was "Sure! What platform are you targeting?"
    And the mock responds to ".*" with "Based on our discussion about Node.js deployment, I recommend using Docker."
    When I send the prompt "Can you elaborate on the deployment?"
    Then the response contains "Node.js"
    And the response contains "deployment"

  # ─── Scenario Outline (parameterized) ──────────────────

  @smoke @parametrized
  Scenario Outline: Responds appropriately to <topic> questions
    Given the mock responds to ".*" with "<expected_response>"
    When I send the prompt "<prompt>"
    Then the response contains "<keyword>"
    And the response is not empty

    Examples:
      | topic       | prompt                      | expected_response                    | keyword    |
      | greeting    | Hello, who are you?         | I am your coding assistant!          | assistant  |
      | capability  | What can you do?            | I can generate and review code.      | code       |
      | limitation  | What are your limitations?  | I cannot access external services.   | cannot     |

  # ─── System Prompt ─────────────────────────────────────

  @behavioral
  Scenario: Follows system prompt instructions
    Given the system prompt is:
      """
      You are a Kubernetes deployment assistant.
      Only answer questions about Kubernetes.
      Refuse any other topic politely.
      """
    And the mock responds to ".*" with "As a Kubernetes assistant, I can help you with pods, services, and deployments."
    When I send the prompt "Tell me about pod management"
    Then the response contains "Kubernetes"
    And the response does not contain "error"

  # ─── Performance ───────────────────────────────────────

  @performance
  Scenario: Responds within acceptable time
    Given the mock has a delay of 50 milliseconds
    And the mock responds to ".*" with "Quick response!"
    When I send the prompt "Give me a fast answer"
    Then the response time is less than 5000 milliseconds
    And the response is not empty
