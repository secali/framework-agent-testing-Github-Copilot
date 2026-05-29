// ─────────────────────────────────────────────────────────────
// Step Registry — pattern-based step matching engine
// ─────────────────────────────────────────────────────────────

import type { ScenarioContext } from "./context.js";
import type { Step } from "./types.js";

export type StepHandler = (
  ctx: ScenarioContext,
  args: string[],
  step: Step
) => Promise<void> | void;

interface StepDefinition {
  pattern: RegExp;
  handler: StepHandler;
  keyword: "Given" | "When" | "Then" | "*";
  description: string;
}

const registry: StepDefinition[] = [];

/**
 * Register a step definition.
 *
 * Patterns use {placeholder} syntax that gets converted to capture groups.
 * Example: "the agent endpoint is {url}" → /^the agent endpoint is "(.*)"$/
 *
 * @param keyword - Which Gherkin phase: Given, When, Then, or * for any
 * @param pattern - Step text pattern with {placeholders}
 * @param handler - Function to execute
 * @param description - Human-readable description for --list-steps
 */
export function defineStep(
  keyword: "Given" | "When" | "Then" | "*",
  pattern: string,
  handler: StepHandler,
  description = ""
): void {
  const regex = patternToRegex(pattern);
  registry.push({ pattern: regex, handler, keyword, description: description || pattern });
}

// Convenience aliases
export const Given = (p: string, h: StepHandler, d = "") => defineStep("Given", p, h, d);
export const When = (p: string, h: StepHandler, d = "") => defineStep("When", p, h, d);
export const Then = (p: string, h: StepHandler, d = "") => defineStep("Then", p, h, d);

/**
 * Find and execute the step handler that matches the given step text.
 */
export async function executeStep(
  step: Step,
  ctx: ScenarioContext
): Promise<void> {
  // Interpolate variables in step text
  const text = ctx.interpolate(step.text);

  for (const def of registry) {
    // Check keyword compatibility
    if (def.keyword !== "*" && def.keyword !== step.resolvedKeyword) {
      continue;
    }

    const match = text.match(def.pattern);
    if (match) {
      const args = match.slice(1); // captured groups
      await def.handler(ctx, args, step);
      return;
    }
  }

  throw new Error(
    `No step definition matches: "${step.resolvedKeyword} ${step.text}" (line ${step.line})\n` +
    `  Use "cat list-steps" to see all available step definitions.`
  );
}

/**
 * Check if a step has a matching step definition registered.
 */
export function hasMatchingStep(keyword: string, text: string): boolean {
  // Simple variable replacement to normalize typical interpolations during validation
  const normalizedText = text.replace(/\{\{[^}]+\}\}/g, "placeholder-val");

  for (const def of registry) {
    if (def.keyword !== "*" && def.keyword !== keyword) {
      continue;
    }
    if (def.pattern.test(normalizedText) || def.pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all registered step definitions (for --list-steps).
 */
export function getRegisteredSteps(): Array<{
  keyword: string;
  pattern: string;
  description: string;
}> {
  return registry.map((d) => ({
    keyword: d.keyword,
    pattern: d.pattern.source,
    description: d.description,
  }));
}

/**
 * Converts a human-friendly pattern to a regex.
 *
 * Rules:
 *   {name}   → captures a quoted argument: "(.*?)"
 *   {n}      → captures a number: (\d+(?:\.\d+)?)
 *   Literal text is escaped.
 *
 * Examples:
 *   'the agent endpoint is {url}'
 *     → /^the agent endpoint is "(.+?)"$/i
 *
 *   'the timeout is {n} milliseconds'
 *     → /^the timeout is (\d+(?:\.\d+)?) milliseconds$/i
 */
function patternToRegex(pattern: string): RegExp {
  // Split by placeholders
  const parts = pattern.split(/(\{[^}]+\})/);
  let regexStr = "^";

  for (const part of parts) {
    if (part === "{n}") {
      // Numeric placeholder
      regexStr += "(\\d+(?:\\.\\d+)?)";
    } else if (part.startsWith("{") && part.endsWith("}")) {
      // String placeholder — matches quoted text
      regexStr += '"(.+?)"';
    } else {
      // Escape literal text
      regexStr += escapeRegex(part);
    }
  }

  regexStr += "$";
  return new RegExp(regexStr, "i");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
