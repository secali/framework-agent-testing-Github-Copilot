// ─────────────────────────────────────────────────────────────
// Feature Runner — executes parsed .feature files
// ─────────────────────────────────────────────────────────────

import { glob } from "glob";
import type { Feature, Scenario, Step } from "./types.js";
import type { Reporter, TestResult, SuiteResult, RunResult, TestStatus } from "../types.js";
import { parseFeatureFile } from "./parser.js";
import { ScenarioContext } from "./context.js";
import { executeStep } from "./step-registry.js";

// Ensure built-in steps are registered
import "./built-in-steps.js";

export interface FeatureRunnerOptions {
  tags?: string[];
  reporters: Reporter[];
  variables?: Record<string, string>;
}

/**
 * Load and run all .feature files matching a glob pattern.
 */
export async function runFeatures(
  pattern: string,
  options: FeatureRunnerOptions
): Promise<RunResult> {
  const files = await glob(pattern, { absolute: true });

  if (files.length === 0) {
    throw new Error(`No .feature files found matching "${pattern}"`);
  }

  const features: Feature[] = [];
  for (const file of files.sort()) {
    features.push(await parseFeatureFile(file));
  }

  return executeFeatures(features, options);
}

/**
 * Run a single feature file.
 */
export async function runFeatureFile(
  filePath: string,
  options: FeatureRunnerOptions
): Promise<RunResult> {
  const feature = await parseFeatureFile(filePath);
  return executeFeatures([feature], options);
}

/**
 * Execute parsed features.
 */
async function executeFeatures(
  features: Feature[],
  options: FeatureRunnerOptions
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();
  const suiteResults: SuiteResult[] = [];

  for (const feature of features) {
    const result = await executeFeature(feature, options);
    suiteResults.push(result);
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startTime);

  const totalTests = suiteResults.reduce((s, r) => s + r.total, 0);
  const passed = suiteResults.reduce((s, r) => s + r.passed, 0);
  const failed = suiteResults.reduce((s, r) => s + r.failed, 0);
  const skipped = suiteResults.reduce((s, r) => s + r.skipped, 0);
  const errors = suiteResults.reduce((s, r) => s + r.errors, 0);
  const nonSkipped = totalTests - skipped;
  const passRate = nonSkipped > 0 ? `${Math.round((passed / nonSkipped) * 100)}%` : "N/A";

  let totalTokens = 0;
  for (const s of suiteResults) {
    for (const t of s.tests) {
      if (t.response?.tokenUsage?.totalTokens) {
        totalTokens += t.response.tokenUsage.totalTokens;
      }
    }
  }

  const runResult: RunResult = {
    startedAt,
    finishedAt,
    durationMs,
    suites: suiteResults,
    summary: {
      totalSuites: features.length,
      totalTests,
      passed,
      failed,
      skipped,
      errors,
      passRate,
      totalTokens,
    },
  };

  for (const reporter of options.reporters) {
    await reporter.onRunEnd(runResult);
  }

  return runResult;
}

async function executeFeature(
  feature: Feature,
  options: FeatureRunnerOptions
): Promise<SuiteResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();

  // Notify reporters — reuse the suite start shape
  for (const reporter of options.reporters) {
    reporter.onSuiteStart?.({
      suite: feature.name,
      description: feature.description,
      agent: { adapter: "unknown" },
      tests: feature.scenarios.map((s) => ({
        name: s.name,
        prompt: "",
        evaluate: [],
        tags: s.tags,
      })),
    });
  }

  // Filter scenarios by tag
  let scenarios = feature.scenarios;
  if (options.tags && options.tags.length > 0) {
    scenarios = scenarios.filter((s) => {
      const allTags = [...feature.tags, ...s.tags];
      return options.tags!.some((t) => allTags.includes(`@${t}`) || allTags.includes(t));
    });
  }

  const testResults: TestResult[] = [];

  for (const scenario of scenarios) {
    if (scenario.examples) {
      // Scenario Outline — expand with each example row
      for (const row of scenario.examples.rows) {
        const expandedScenario = expandOutline(scenario, scenario.examples.headers, row);
        const result = await executeScenario(expandedScenario, feature, options);
        testResults.push(result);
        for (const reporter of options.reporters) {
          reporter.onTestResult?.(result);
        }
      }
    } else {
      const result = await executeScenario(scenario, feature, options);
      testResults.push(result);
      for (const reporter of options.reporters) {
        reporter.onTestResult?.(result);
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startTime);

  const suiteResult: SuiteResult = {
    suite: feature.name,
    agent: { adapter: "feature" },
    startedAt,
    finishedAt,
    durationMs,
    total: testResults.length,
    passed: testResults.filter((t) => t.status === "passed").length,
    failed: testResults.filter((t) => t.status === "failed").length,
    skipped: testResults.filter((t) => t.status === "skipped").length,
    errors: testResults.filter((t) => t.status === "error").length,
    tests: testResults,
  };

  for (const reporter of options.reporters) {
    reporter.onSuiteEnd?.(suiteResult);
  }

  return suiteResult;
}

async function executeScenario(
  scenario: Scenario,
  feature: Feature,
  options: FeatureRunnerOptions
): Promise<TestResult> {
  const startTime = performance.now();
  const ctx = new ScenarioContext();

  // Load global variables
  ctx.loadEnvVariables();
  if (options.variables) {
    Object.assign(ctx.variables, options.variables);
  }

  try {
    // Run Background steps first
    if (feature.background) {
      for (const step of feature.background) {
        await executeStep(step, ctx);
      }
    }

    // Run scenario steps
    for (const step of scenario.steps) {
      await executeStep(step, ctx);
    }

    const durationMs = Math.round(performance.now() - startTime);
    const allPassed = ctx.results.length > 0 && ctx.results.every((r) => r.passed);
    const status: TestStatus = ctx.results.length === 0
      ? "passed" // No Then steps = setup-only scenario
      : allPassed
        ? "passed"
        : "failed";

    return {
      name: scenario.name,
      status,
      durationMs,
      prompt: ctx.prompt,
      response: ctx.response ?? undefined,
      evaluations: ctx.results,
      retries: 0,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      name: scenario.name,
      status: "error",
      durationMs,
      prompt: ctx.prompt,
      evaluations: ctx.results,
      error: err instanceof Error ? err.message : String(err),
      retries: 0,
    };
  }
}

/**
 * Expand a Scenario Outline with example values.
 * Replaces <placeholder> in step text with values from the example row.
 */
function expandOutline(
  scenario: Scenario,
  headers: string[],
  values: string[]
): Scenario {
  const replacements = new Map<string, string>();
  for (let i = 0; i < headers.length; i++) {
    replacements.set(headers[i], values[i]);
  }

  const nameExpanded = replaceOutlinePlaceholders(scenario.name, replacements);

  const steps: Step[] = scenario.steps.map((step) => ({
    ...step,
    text: replaceOutlinePlaceholders(step.text, replacements),
    docString: step.docString
      ? replaceOutlinePlaceholders(step.docString, replacements)
      : null,
  }));

  return {
    name: nameExpanded,
    tags: scenario.tags,
    steps,
    examples: null,
  };
}

function replaceOutlinePlaceholders(
  text: string,
  replacements: Map<string, string>
): string {
  return text.replace(/<(\w+)>/g, (match, key: string) => {
    return replacements.get(key) ?? match;
  });
}
