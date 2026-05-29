// ─────────────────────────────────────────────────────────────
// JSON Reporter — exports results to a JSON file
// ─────────────────────────────────────────────────────────────

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Reporter, RunResult } from "../types.js";

/**
 * Writes the full RunResult to a JSON file.
 * Useful for CI/CD pipelines, dashboards, and historical tracking.
 */
export class JsonReporter implements Reporter {
  name = "json";
  private outputPath: string;

  constructor(outputPath = "results/report.json") {
    this.outputPath = outputPath;
  }

  async onRunEnd(result: RunResult): Promise<void> {
    await mkdir(dirname(this.outputPath), { recursive: true });
    await writeFile(this.outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n📄 JSON report saved to: ${this.outputPath}`);
  }
}
