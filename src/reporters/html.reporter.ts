// ─────────────────────────────────────────────────────────────
// HTML Reporter — gorgeous visual dashboard
// ─────────────────────────────────────────────────────────────

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Reporter, RunResult } from "../types.js";

/**
 * Generates a static HTML dashboard from the RunResult.
 */
export class HtmlReporter implements Reporter {
  name = "html";
  private outputPath: string;

  constructor(outputPath = "results/report.html") {
    this.outputPath = outputPath;
  }

  async onRunEnd(result: RunResult): Promise<void> {
    await mkdir(dirname(this.outputPath), { recursive: true });
    
    const html = this.generateHtml(result);
    await writeFile(this.outputPath, html, "utf-8");
    console.log(`\n📊 HTML visual report saved to: ${this.outputPath}`);
  }

  private generateHtml(result: RunResult): string {
    const { summary, suites } = result;
    const allPassed = summary.failed === 0 && summary.errors === 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAT Test Report</title>
  <style>
    :root {
      --bg: #0d1117;
      --panel: #161b22;
      --text: #c9d1d9;
      --dim: #8b949e;
      --border: #30363d;
      --green: #238636;
      --red: #da3633;
      --yellow: #d29922;
      --blue: #58a6ff;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      background: ${allPassed ? "var(--green)" : "var(--red)"};
      color: white;
    }
    .metrics {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric {
      background: var(--panel);
      padding: 15px;
      border-radius: 6px;
      border: 1px solid var(--border);
      flex: 1;
      text-align: center;
    }
    .metric .value { font-size: 24px; font-weight: bold; margin-top: 10px; }
    .metric.passed .value { color: var(--green); }
    .metric.failed .value { color: var(--red); }
    .suite {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .suite-header {
      padding: 15px;
      background: #1c2128;
      border-bottom: 1px solid var(--border);
      font-weight: bold;
      display: flex;
      justify-content: space-between;
    }
    .test {
      padding: 15px;
      border-bottom: 1px solid var(--border);
    }
    .test:last-child { border-bottom: none; }
    .test-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .icon {
      font-weight: bold;
    }
    .icon.passed { color: var(--green); }
    .icon.failed { color: var(--red); }
    .icon.skipped { color: var(--yellow); }
    
    .test-details {
      margin-top: 15px;
      padding: 15px;
      background: #0d1117;
      border-radius: 6px;
      border: 1px solid var(--border);
      display: none;
    }
    .test.open .test-details {
      display: block;
    }
    pre {
      background: #010409;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    .evaluation {
      margin: 10px 0;
      padding-left: 20px;
      border-left: 2px solid var(--dim);
    }
    .evaluation.failed { border-color: var(--red); }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐱 CAT Framework Report</h1>
    <div class="status-badge">${allPassed ? "PASSED" : "FAILED"}</div>
  </div>

  <div class="metrics">
    <div class="metric"><div class="label">Total Tests</div><div class="value">${summary.totalTests}</div></div>
    <div class="metric passed"><div class="label">Passed</div><div class="value">${summary.passed}</div></div>
    <div class="metric failed"><div class="label">Failed</div><div class="value">${summary.failed}</div></div>
    <div class="metric"><div class="label">Duration</div><div class="value">${result.durationMs}ms</div></div>
    ${summary.totalTokens ? `<div class="metric"><div class="label">Tokens Used</div><div class="value" style="color: var(--blue);">${summary.totalTokens.toLocaleString()}</div></div>` : ""}
  </div>

  ${suites.map(suite => `
    <div class="suite">
      <div class="suite-header">
        <span>${suite.suite}</span>
        <span style="color: var(--dim)">${suite.durationMs}ms | ${suite.passed}/${suite.total} passed</span>
      </div>
      <div class="suite-tests">
        ${suite.tests.map(test => `
          <div class="test ${test.status === 'failed' || test.status === 'error' ? 'open' : ''}">
            <div class="test-header" onclick="this.parentElement.classList.toggle('open')">
              <span class="icon ${test.status}">${this.getIcon(test.status)}</span>
              <span>${test.name}</span>
              <span style="color: var(--dim); margin-left: auto;">${test.durationMs}ms</span>
            </div>
            <div class="test-details">
              <h4>Evaluations</h4>
              ${test.evaluations.map(ev => `
                <div class="evaluation ${ev.passed ? 'passed' : 'failed'}">
                  <div style="font-weight: bold; color: ${ev.passed ? 'var(--green)' : 'var(--red)'}">
                    ${ev.passed ? '✓' : '✗'} ${ev.label}
                  </div>
                  ${!ev.passed ? `<div style="margin-top: 5px; color: var(--dim)">${ev.message}</div>` : ''}
                </div>
              `).join('')}
              
              ${test.error ? `
                <div class="evaluation failed">
                  <div style="font-weight: bold; color: var(--red)">⚠ Execution Error</div>
                  <div style="margin-top: 5px; color: var(--dim)">${test.error}</div>
                </div>
              ` : ''}

              <h4>Prompt</h4>
              <pre><code>${this.escapeHtml(test.prompt)}</code></pre>
              
              ${test.response ? `
                <h4>Agent Response</h4>
                <pre><code>${this.escapeHtml(test.response.text)}</code></pre>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>`;
  }

  private getIcon(status: string): string {
    switch (status) {
      case "passed": return "✓";
      case "failed": return "✗";
      case "skipped": return "○";
      case "error": return "⚠";
      default: return "?";
    }
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }
}
