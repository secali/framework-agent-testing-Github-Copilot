// ─────────────────────────────────────────────────────────────
// Contains Evaluator — checks if response contains expected text
// ─────────────────────────────────────────────────────────────

import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

/**
 * YAML usage:
 *   - type: contains
 *     expected: "function hello"
 *     caseSensitive: false   # optional, default false
 */
export class ContainsEvaluator implements Evaluator {
  type = "contains";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const expected = def.expected as string;
    if (!expected) {
      return {
        evaluator: this.type,
        label: def.label ?? "contains",
        passed: false,
        message: "Missing 'expected' field in evaluator definition",
      };
    }

    const caseSensitive = (def.caseSensitive as boolean) ?? false;
    const text = caseSensitive ? response.text : response.text.toLowerCase();
    const target = caseSensitive ? expected : expected.toLowerCase();
    const passed = text.includes(target);

    return {
      evaluator: this.type,
      label: def.label ?? `contains "${expected}"`,
      passed,
      message: passed
        ? `Response contains "${expected}"`
        : `Expected response to contain "${expected}"`,
    };
  }
}

/**
 * YAML usage:
 *   - type: not-contains
 *     expected: "error"
 */
export class NotContainsEvaluator implements Evaluator {
  type = "not-contains";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const expected = def.expected as string;
    if (!expected) {
      return {
        evaluator: this.type,
        label: def.label ?? "not-contains",
        passed: false,
        message: "Missing 'expected' field in evaluator definition",
      };
    }

    const caseSensitive = (def.caseSensitive as boolean) ?? false;
    const text = caseSensitive ? response.text : response.text.toLowerCase();
    const target = caseSensitive ? expected : expected.toLowerCase();
    const passed = !text.includes(target);

    return {
      evaluator: this.type,
      label: def.label ?? `not-contains "${expected}"`,
      passed,
      message: passed
        ? `Response does not contain "${expected}"`
        : `Expected response NOT to contain "${expected}", but it does`,
    };
  }
}
