// ─────────────────────────────────────────────────────────────
// Test Runner — orchestrates suite execution
// ─────────────────────────────────────────────────────────────

import type {
  TestSuiteDefinition,
  TestCaseDefinition,
  AgentConfig,
  TestResult,
  SuiteResult,
  RunResult,
  Reporter,
  EvaluatorResult,
} from "./types.js";
import { getAdapter } from "./adapters/index.js";
import { getEvaluator } from "./evaluators/index.js";
import { interpolate } from "./loader.js";

export interface RunnerOptions {
  /** Tags to filter tests by (inclusive) */
  tags?: string[];
  /** Max parallel test execution per suite */
  concurrency?: number;
  /** Reporters to use */
  reporters: Reporter[];
  /** Global variable overrides */
  variables?: Record<string, string>;
}

/**
 * Main test runner. Takes loaded suites and executes them,
 * feeding results to reporters in real-time.
 */
export async function runSuites(
  suites: TestSuiteDefinition[],
  options: RunnerOptions
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();

  const suiteResults: SuiteResult[] = [];

  for (const suite of suites) {
    const result = await runSuite(suite, options);
    suiteResults.push(result);
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startTime);

  // Compute summary
  const totalTests = suiteResults.reduce((sum, s) => sum + s.total, 0);
  const passed = suiteResults.reduce((sum, s) => sum + s.passed, 0);
  const failed = suiteResults.reduce((sum, s) => sum + s.failed, 0);
  const skipped = suiteResults.reduce((sum, s) => sum + s.skipped, 0);
  const errors = suiteResults.reduce((sum, s) => sum + s.errors, 0);
  const passRate =
    totalTests > 0
      ? `${Math.round((passed / (totalTests - skipped)) * 100)}%`
      : "N/A";

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
      totalSuites: suites.length,
      totalTests,
      passed,
      failed,
      skipped,
      errors,
      passRate,
      totalTokens,
    },
  };

  // Notify reporters
  for (const reporter of options.reporters) {
    await reporter.onRunEnd(runResult);
  }

  return runResult;
}

async function runSuite(
  suite: TestSuiteDefinition,
  options: RunnerOptions
): Promise<SuiteResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();

  // Merge variables
  const variables = { ...suite.variables, ...options.variables };

  // Notify reporters
  for (const reporter of options.reporters) {
    reporter.onSuiteStart?.(suite);
  }

  // Filter tests by tags
  let tests = suite.tests;
  if (options.tags && options.tags.length > 0) {
    tests = tests.filter((t) =>
      options.tags!.some((tag) => t.tags?.includes(tag))
    );
  }

  // Execute tests (sequentially for now — concurrency can be added later)
  const testResults: TestResult[] = [];

  for (const testDef of tests) {
    const result = await runTest(testDef, suite.agent, variables);
    testResults.push(result);

    // Notify reporters
    for (const reporter of options.reporters) {
      reporter.onTestResult?.(result);
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startTime);

  const suiteResult: SuiteResult = {
    suite: suite.suite,
    agent: suite.agent,
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

  // Notify reporters
  for (const reporter of options.reporters) {
    reporter.onSuiteEnd?.(suiteResult);
  }

  return suiteResult;
}

async function runTest(
  testDef: TestCaseDefinition,
  agentConfig: AgentConfig,
  variables: Record<string, string>
): Promise<TestResult> {
  // Handle skipped tests
  if (testDef.skip) {
    return {
      name: testDef.name,
      status: "skipped",
      durationMs: 0,
      prompt: testDef.prompt,
      evaluations: [],
      retries: 0,
    };
  }

  const maxRetries = testDef.retries ?? 0;
  let lastResult: TestResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await executeTest(testDef, agentConfig, variables);
    lastResult.retries = attempt;

    if (lastResult.status === "passed") {
      return lastResult;
    }
  }

  return lastResult!;
}

async function executeTest(
  testDef: TestCaseDefinition,
  agentConfig: AgentConfig,
  variables: Record<string, string>
): Promise<TestResult> {
  const startTime = performance.now();

  // Merge test-level agent overrides
  const config: AgentConfig = { ...agentConfig, ...testDef.agent };

  // Interpolate variables in prompt
  const prompt = interpolate(testDef.prompt, variables);

  try {
    // Get the adapter and invoke the agent
    const adapter = getAdapter(config.adapter);
    const response = await adapter.invoke(prompt, testDef.context, config);

    // Run all evaluators
    const evaluations: EvaluatorResult[] = [];

    for (const evalDef of testDef.evaluate) {
      const evaluator = getEvaluator(evalDef.type);
      const result = await evaluator.evaluate(response, evalDef);
      evaluations.push(result);
    }

    const allPassed = evaluations.every((e) => e.passed);
    const durationMs = Math.round(performance.now() - startTime);

    return {
      name: testDef.name,
      status: allPassed ? "passed" : "failed",
      durationMs,
      prompt,
      response,
      evaluations,
      retries: 0,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);

    return {
      name: testDef.name,
      status: "error",
      durationMs,
      prompt,
      evaluations: [],
      error: err instanceof Error ? err.message : String(err),
      retries: 0,
    };
  }
}
