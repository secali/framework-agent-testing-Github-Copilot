// ─────────────────────────────────────────────────────────────
// Regex Evaluator — checks if response matches a regex pattern
// ─────────────────────────────────────────────────────────────

import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

/**
 * YAML usage:
 *   - type: regex
 *     pattern: "def \\w+\\(.*\\):"
 *     flags: "i"   # optional, default ""
 */
export class RegexEvaluator implements Evaluator {
  type = "regex";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const pattern = def.pattern as string;
    if (!pattern) {
      return {
        evaluator: this.type,
        label: def.label ?? "regex",
        passed: false,
        message: "Missing 'pattern' field in evaluator definition",
      };
    }

    const flags = (def.flags as string) ?? "";

    try {
      const regex = new RegExp(pattern, flags);
      const passed = regex.test(response.text);

      return {
        evaluator: this.type,
        label: def.label ?? `regex /${pattern}/${flags}`,
        passed,
        message: passed
          ? `Response matches pattern /${pattern}/${flags}`
          : `Expected response to match /${pattern}/${flags}`,
      };
    } catch (err) {
      return {
        evaluator: this.type,
        label: def.label ?? "regex",
        passed: false,
        message: `Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
