// ─────────────────────────────────────────────────────────────
// Suite Loader — reads and validates YAML test suite files
// ─────────────────────────────────────────────────────────────

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { glob } from "glob";
import type { TestSuiteDefinition } from "./types.js";

/**
 * Loads all test suite files matching the given glob pattern.
 * Each YAML file maps to one TestSuiteDefinition.
 */
export async function loadSuites(
  pattern: string,
  basePath: string = process.cwd()
): Promise<TestSuiteDefinition[]> {
  const files = await glob(pattern, { cwd: basePath, absolute: true });

  if (files.length === 0) {
    throw new Error(
      `No test suite files found matching "${pattern}" in ${basePath}`
    );
  }

  const suites: TestSuiteDefinition[] = [];

  for (const file of files.sort()) {
    const content = await readFile(file, "utf-8");
    const parsed = parseYaml(content) as TestSuiteDefinition;
    validateSuite(parsed, file);
    suites.push(parsed);
  }

  return suites;
}

/**
 * Loads a single suite from a file path.
 */
export async function loadSuite(filePath: string): Promise<TestSuiteDefinition> {
  const absPath = resolve(filePath);
  const content = await readFile(absPath, "utf-8");
  const parsed = parseYaml(content) as TestSuiteDefinition;
  validateSuite(parsed, absPath);
  return parsed;
}

/**
 * Minimal validation to catch obvious errors early.
 * Keeps it simple — no heavy schema libraries needed.
 */
function validateSuite(suite: TestSuiteDefinition, filePath: string): void {
  const errors: string[] = [];

  if (!suite.suite) {
    errors.push("Missing required field: 'suite' (suite name)");
  }

  if (!suite.agent?.adapter) {
    errors.push("Missing required field: 'agent.adapter'");
  }

  if (!Array.isArray(suite.tests) || suite.tests.length === 0) {
    errors.push("Suite must contain at least one test case");
  }

  for (const [i, test] of (suite.tests ?? []).entries()) {
    if (!test.name) {
      errors.push(`Test #${i + 1}: missing 'name'`);
    }
    if (!test.prompt) {
      errors.push(`Test "${test.name || i + 1}": missing 'prompt'`);
    }
    if (!Array.isArray(test.evaluate) || test.evaluate.length === 0) {
      errors.push(`Test "${test.name || i + 1}": must have at least one evaluator`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid test suite "${filePath}":\n  - ${errors.join("\n  - ")}`
    );
  }
}

/**
 * Resolves {{variable}} placeholders in a string using the variables map.
 */
export function interpolate(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}
