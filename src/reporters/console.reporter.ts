// ─────────────────────────────────────────────────────────────
// Console Reporter — colorful terminal output
// ─────────────────────────────────────────────────────────────

import type { Reporter, TestSuiteDefinition, TestResult, SuiteResult, RunResult } from "../types.js";

// ANSI escape codes for terminal colors (no dependency needed)
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
};

const ICONS = {
  passed: `${c.green}✓${c.reset}`,
  failed: `${c.red}✗${c.reset}`,
  skipped: `${c.yellow}○${c.reset}`,
  error: `${c.red}⚠${c.reset}`,
  suite: `${c.cyan}◈${c.reset}`,
};

export class ConsoleReporter implements Reporter {
  name = "console";
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  onSuiteStart(suite: TestSuiteDefinition): void {
    console.log(
      `\n${ICONS.suite} ${c.bold}${suite.suite}${c.reset} ${c.dim}(${suite.tests.length} tests, adapter: ${suite.agent.adapter})${c.reset}`
    );
  }

  onTestResult(result: TestResult): void {
    const icon = ICONS[result.status];
    const duration = `${c.dim}(${result.durationMs}ms)${c.reset}`;

    console.log(`  ${icon} ${result.name} ${duration}`);

    if (result.status === "failed" || result.status === "error" || this.verbose) {
      for (const ev of result.evaluations) {
        const evIcon = ev.passed ? ICONS.passed : ICONS.failed;
        console.log(`    ${evIcon} ${c.dim}${ev.label}${c.reset}`);
        if (!ev.passed) {
          console.log(`      ${c.red}${ev.message}${c.reset}`);
        }
      }

      if (result.error) {
        console.log(`    ${c.red}Error: ${result.error}${c.reset}`);
      }
    }
  }

  onSuiteEnd(result: SuiteResult): void {
    const summary = [
      `${c.green}${result.passed} passed${c.reset}`,
      result.failed > 0 ? `${c.red}${result.failed} failed${c.reset}` : null,
      result.skipped > 0 ? `${c.yellow}${result.skipped} skipped${c.reset}` : null,
      result.errors > 0 ? `${c.red}${result.errors} errors${c.reset}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`  ${c.dim}─────${c.reset} ${summary} ${c.dim}(${result.durationMs}ms)${c.reset}`);
  }

  onRunEnd(result: RunResult): void {
    const { summary } = result;
    const allPassed = summary.failed === 0 && summary.errors === 0;
    const statusBar = allPassed
      ? `${c.bgGreen}${c.bold} ALL TESTS PASSED ${c.reset}`
      : `${c.bgRed}${c.bold} TESTS FAILED ${c.reset}`;

    console.log(`\n${statusBar}`);
    console.log(
      `\n${c.bold}Results:${c.reset} ${summary.totalTests} tests across ${summary.totalSuites} suites`
    );
    console.log(
      `  ${c.green}✓ ${summary.passed} passed${c.reset} | ${c.red}✗ ${summary.failed} failed${c.reset} | ${c.yellow}○ ${summary.skipped} skipped${c.reset} | ${c.red}⚠ ${summary.errors} errors${c.reset}`
    );
    const tokenUsageStr = summary.totalTokens && summary.totalTokens > 0
      ? ` | ${c.cyan}Tokens: ${summary.totalTokens.toLocaleString()}${c.reset}`
      : "";

    console.log(
      `  ${c.dim}Pass rate: ${summary.passRate} | Duration: ${result.durationMs}ms${c.reset}${tokenUsageStr}`
    );
    console.log();
  }
}
