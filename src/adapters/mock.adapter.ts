// ─────────────────────────────────────────────────────────────
// Mock Agent Adapter — deterministic responses for testing
// ─────────────────────────────────────────────────────────────

import type {
  AgentAdapter,
  AgentConfig,
  AgentResponse,
  TestContext,
} from "../types.js";

/**
 * Mock adapter for testing the framework itself.
 *
 * Configure responses in agent.options.responses as a map of
 * prompt patterns (regex) to response text.
 *
 * Example YAML:
 *   agent:
 *     adapter: mock
 *     options:
 *       responses:
 *         "hello|greet": "Hello! How can I help you?"
 *         ".*": "I don't understand that."
 *       delay: 100
 */
export class MockAdapter implements AgentAdapter {
  name = "mock";

  async invoke(
    prompt: string,
    _context?: TestContext,
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const options = config?.options ?? {};
    const responses = (options.responses ?? {}) as Record<string, string>;
    const delay = (options.delay as number) ?? 0;
    const toolCalls = (options.toolCalls ?? []) as AgentResponse["toolCalls"];
    const fileChanges = (options.fileChanges ?? []) as AgentResponse["fileChanges"];

    // Simulate latency
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    // Match prompt against response patterns
    let responseText = "No mock response configured for this prompt.";

    for (const [pattern, text] of Object.entries(responses)) {
      if (new RegExp(pattern, "i").test(prompt)) {
        responseText = text;
        break;
      }
    }

    const start = performance.now();

    return {
      text: responseText,
      toolCalls,
      fileChanges,
      statusCode: 200,
      durationMs: Math.round(performance.now() - start) + delay,
      raw: { prompt, response: responseText },
    };
  }
}
