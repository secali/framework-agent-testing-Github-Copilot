// ─────────────────────────────────────────────────────────────
// JSON Schema Evaluator — validates response against a JSON Schema
// ─────────────────────────────────────────────────────────────

import Ajv from "ajv";
import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

const ajv = new Ajv({ allErrors: true });

/**
 * YAML usage:
 *   - type: json-schema
 *     schema:
 *       type: object
 *       required: [name, version]
 *       properties:
 *         name: { type: string }
 *         version: { type: string }
 */
export class JsonSchemaEvaluator implements Evaluator {
  type = "json-schema";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const schema = def.schema;
    if (!schema) {
      return {
        evaluator: this.type,
        label: def.label ?? "json-schema",
        passed: false,
        message: "Missing 'schema' field in evaluator definition",
      };
    }

    // Try to parse JSON from response text
    let parsed: unknown;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.text;
      parsed = JSON.parse(jsonText.trim());
    } catch {
      return {
        evaluator: this.type,
        label: def.label ?? "json-schema",
        passed: false,
        message: "Response is not valid JSON",
        details: { responsePreview: response.text.slice(0, 200) },
      };
    }

    const validate = ajv.compile(schema as object);
    const passed = validate(parsed) as boolean;

    return {
      evaluator: this.type,
      label: def.label ?? "json-schema validation",
      passed,
      message: passed
        ? "Response matches JSON schema"
        : `Schema validation failed: ${ajv.errorsText(validate.errors)}`,
      details: passed ? undefined : validate.errors,
    };
  }
}
