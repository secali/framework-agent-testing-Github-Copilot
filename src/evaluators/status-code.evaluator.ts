// ─────────────────────────────────────────────────────────────
// Status Code Evaluator — checks HTTP status or exit code
// ─────────────────────────────────────────────────────────────

import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

/**
 * YAML usage:
 *   - type: status-code
 *     expected: 200
 *
 *   - type: status-code
 *     expected: 0            # for CLI agents (exit code)
 */
export class StatusCodeEvaluator implements Evaluator {
  type = "status-code";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const expected = def.expected as number;
    if (expected === undefined || expected === null) {
      return {
        evaluator: this.type,
        label: def.label ?? "status-code",
        passed: false,
        message: "Missing 'expected' field in evaluator definition",
      };
    }

    const passed = response.statusCode === expected;

    return {
      evaluator: this.type,
      label: def.label ?? `status-code = ${expected}`,
      passed,
      message: passed
        ? `Status code is ${expected}`
        : `Expected status code ${expected}, got ${response.statusCode}`,
    };
  }
}
