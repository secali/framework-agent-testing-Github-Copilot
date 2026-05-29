// ─────────────────────────────────────────────────────────────
// Evaluator Registry — maps evaluator types to implementations
// ─────────────────────────────────────────────────────────────

import type { Evaluator } from "../types.js";
import { ContainsEvaluator, NotContainsEvaluator } from "./contains.evaluator.js";
import { RegexEvaluator } from "./regex.evaluator.js";
import { JsonSchemaEvaluator } from "./json-schema.evaluator.js";
import { ToolCalledEvaluator, ToolNotCalledEvaluator } from "./tool-call.evaluator.js";
import { LlmJudgeEvaluator } from "./llm-judge.evaluator.js";
import { StatusCodeEvaluator } from "./status-code.evaluator.js";

const builtInEvaluators: Record<string, () => Evaluator> = {
  "contains": () => new ContainsEvaluator(),
  "not-contains": () => new NotContainsEvaluator(),
  "regex": () => new RegexEvaluator(),
  "json-schema": () => new JsonSchemaEvaluator(),
  "tool-called": () => new ToolCalledEvaluator(),
  "tool-not-called": () => new ToolNotCalledEvaluator(),
  "llm-judge": () => new LlmJudgeEvaluator(),
  "status-code": () => new StatusCodeEvaluator(),
};

const customEvaluators = new Map<string, () => Evaluator>();

/**
 * Get an evaluator by type.
 */
export function getEvaluator(type: string): Evaluator {
  const factory = customEvaluators.get(type) ?? builtInEvaluators[type];

  if (!factory) {
    const available = [
      ...Object.keys(builtInEvaluators),
      ...customEvaluators.keys(),
    ].join(", ");
    throw new Error(
      `Unknown evaluator type "${type}". Available: ${available}`
    );
  }

  return factory();
}

/**
 * Register a custom evaluator type.
 */
export function registerEvaluator(
  type: string,
  factory: () => Evaluator
): void {
  customEvaluators.set(type, factory);
}
