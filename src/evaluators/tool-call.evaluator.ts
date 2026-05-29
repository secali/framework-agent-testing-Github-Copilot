// ─────────────────────────────────────────────────────────────
// Tool Call Evaluator — verifies the agent called specific tools
// ─────────────────────────────────────────────────────────────

import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

/**
 * YAML usage:
 *   - type: tool-called
 *     tool: "search_code"
 *     withArgs:            # optional
 *       query: "hello"
 *
 *   - type: tool-not-called
 *     tool: "delete_file"
 */
export class ToolCalledEvaluator implements Evaluator {
  type = "tool-called";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const toolName = def.tool as string;
    if (!toolName) {
      return {
        evaluator: this.type,
        label: def.label ?? "tool-called",
        passed: false,
        message: "Missing 'tool' field in evaluator definition",
      };
    }

    const matchingCalls = response.toolCalls.filter(
      (tc) => tc.name === toolName
    );
    const wasCalled = matchingCalls.length > 0;

    // If withArgs is specified, check that at least one call matches
    const withArgs = def.withArgs as Record<string, unknown> | undefined;
    let argsMatch = true;

    if (wasCalled && withArgs) {
      argsMatch = matchingCalls.some((tc) =>
        Object.entries(withArgs).every(
          ([key, value]) =>
            JSON.stringify(tc.arguments[key]) === JSON.stringify(value)
        )
      );
    }

    const passed = wasCalled && argsMatch;
    const calledTools = response.toolCalls.map((tc) => tc.name).join(", ") || "(none)";

    return {
      evaluator: this.type,
      label: def.label ?? `tool-called "${toolName}"`,
      passed,
      message: passed
        ? `Tool "${toolName}" was called${withArgs ? " with matching arguments" : ""}`
        : wasCalled && !argsMatch
          ? `Tool "${toolName}" was called but arguments did not match`
          : `Tool "${toolName}" was NOT called. Called tools: ${calledTools}`,
      details: { matchingCalls, expectedArgs: withArgs },
    };
  }
}

export class ToolNotCalledEvaluator implements Evaluator {
  type = "tool-not-called";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const toolName = def.tool as string;
    if (!toolName) {
      return {
        evaluator: this.type,
        label: def.label ?? "tool-not-called",
        passed: false,
        message: "Missing 'tool' field in evaluator definition",
      };
    }

    const wasCalled = response.toolCalls.some((tc) => tc.name === toolName);

    return {
      evaluator: this.type,
      label: def.label ?? `tool-not-called "${toolName}"`,
      passed: !wasCalled,
      message: !wasCalled
        ? `Tool "${toolName}" was not called (as expected)`
        : `Expected tool "${toolName}" NOT to be called, but it was`,
    };
  }
}
