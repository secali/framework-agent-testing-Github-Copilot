// ─────────────────────────────────────────────────────────────
// Lightweight Gherkin Parser
// ─────────────────────────────────────────────────────────────

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Feature, Scenario, Step, DataTableRow, ExamplesTable } from "./types.js";

const KEYWORDS = ["Given", "When", "Then", "And", "But"] as const;
type Keyword = (typeof KEYWORDS)[number];

/**
 * Parses a .feature file into a Feature AST.
 */
export async function parseFeatureFile(filePath: string): Promise<Feature> {
  const absPath = resolve(filePath);
  const content = await readFile(absPath, "utf-8");
  return parseFeature(content, absPath);
}

export function parseFeature(content: string, source = "<inline>"): Feature {
  const lines = content.split(/\r?\n/);
  let cursor = 0;

  // ─── Helpers ──────────────────────────────────────────────

  function currentLine(): string {
    return lines[cursor]?.trim() ?? "";
  }

  function advance(): void {
    cursor++;
  }

  function atEnd(): boolean {
    return cursor >= lines.length;
  }

  function skipBlanksAndComments(): void {
    while (!atEnd()) {
      const line = currentLine();
      if (line === "" || line.startsWith("#")) {
        advance();
      } else {
        break;
      }
    }
  }

  function parseTags(): string[] {
    const tags: string[] = [];
    while (!atEnd() && currentLine().startsWith("@")) {
      const tagLine = currentLine();
      const found = tagLine.match(/@[\w-]+/g);
      if (found) tags.push(...found);
      advance();
    }
    return tags;
  }

  function parseDocString(): string | null {
    skipBlanksAndComments();
    if (atEnd()) return null;

    const line = currentLine();
    if (!line.startsWith('"""') && !line.startsWith("```")) {
      return null;
    }

    const delimiter = line.startsWith('"""') ? '"""' : "```";
    advance(); // skip opening delimiter

    const docLines: string[] = [];
    while (!atEnd()) {
      const raw = lines[cursor]; // preserve indentation
      if (raw.trim().startsWith(delimiter)) {
        advance(); // skip closing delimiter
        break;
      }
      docLines.push(raw);
      advance();
    }

    return docLines.join("\n");
  }

  function parseDataTable(): DataTableRow[] | null {
    skipBlanksAndComments();
    if (atEnd() || !currentLine().startsWith("|")) return null;

    const rows: DataTableRow[] = [];
    while (!atEnd() && currentLine().startsWith("|")) {
      const cells = currentLine()
        .split("|")
        .slice(1, -1) // remove first and last empty segments
        .map((c) => c.trim());
      rows.push({ cells });
      advance();
    }
    return rows;
  }

  function parseStep(): Step | null {
    skipBlanksAndComments();
    if (atEnd()) return null;

    const line = currentLine();
    const lineNum = cursor + 1;

    // Match "Given ...", "When ...", etc.
    const match = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
    if (!match) return null;

    const keyword = match[1] as Keyword;
    const text = match[2];
    advance();

    const docString = parseDocString();
    const dataTable = parseDataTable();

    return {
      keyword,
      resolvedKeyword: keyword as any, // will be resolved later
      text,
      docString,
      dataTable,
      line: lineNum,
    };
  }

  function parseSteps(): Step[] {
    const steps: Step[] = [];
    let lastResolved: "Given" | "When" | "Then" = "Given";

    while (true) {
      skipBlanksAndComments();
      if (atEnd()) break;

      const line = currentLine();
      // Stop if we hit a new section keyword
      if (
        line.startsWith("Scenario:") ||
        line.startsWith("Scenario Outline:") ||
        line.startsWith("Background:") ||
        line.startsWith("Feature:") ||
        line.startsWith("Examples:") ||
        line.startsWith("@")
      ) {
        break;
      }

      const step = parseStep();
      if (!step) break;

      // Resolve And/But to the previous concrete keyword
      if (step.keyword === "And" || step.keyword === "But") {
        step.resolvedKeyword = lastResolved;
      } else {
        step.resolvedKeyword = step.keyword as "Given" | "When" | "Then";
        lastResolved = step.resolvedKeyword;
      }

      steps.push(step);
    }

    return steps;
  }

  function parseExamples(): ExamplesTable | null {
    skipBlanksAndComments();
    if (atEnd() || !currentLine().startsWith("Examples:")) return null;

    advance(); // skip "Examples:" line
    const table = parseDataTable();
    if (!table || table.length < 2) return null;

    const headers = table[0].cells;
    const rows = table.slice(1).map((r) => r.cells);

    return { headers, rows };
  }

  function parseScenario(): Scenario | null {
    skipBlanksAndComments();
    if (atEnd()) return null;

    const tags = parseTags();
    skipBlanksAndComments();
    if (atEnd()) return null;

    const line = currentLine();
    const isOutline = line.startsWith("Scenario Outline:");
    const isScenario = line.startsWith("Scenario:");

    if (!isScenario && !isOutline) return null;

    const name = line.replace(/^Scenario(?:\s+Outline)?:\s*/, "").trim();
    advance();

    const steps = parseSteps();
    const examples = isOutline ? parseExamples() : null;

    return { name, tags, steps, examples };
  }

  // ─── Main Parse ───────────────────────────────────────────

  // Parse feature-level tags
  skipBlanksAndComments();
  const featureTags = parseTags();

  // Parse Feature line
  skipBlanksAndComments();
  const featureLine = currentLine();
  if (!featureLine.startsWith("Feature:")) {
    throw new Error(`${source}:${cursor + 1} — Expected "Feature:" but got "${featureLine}"`);
  }
  const featureName = featureLine.replace(/^Feature:\s*/, "").trim();
  advance();

  // Parse description (free text until next keyword)
  const descLines: string[] = [];
  while (!atEnd()) {
    skipBlanksAndComments();
    if (atEnd()) break;
    const line = currentLine();
    if (
      line.startsWith("Background:") ||
      line.startsWith("Scenario:") ||
      line.startsWith("Scenario Outline:") ||
      line.startsWith("@")
    ) {
      break;
    }
    descLines.push(line);
    advance();
  }

  // Parse Background (optional)
  let background: Step[] | null = null;
  skipBlanksAndComments();
  if (!atEnd() && currentLine().startsWith("Background:")) {
    advance();
    background = parseSteps();
  }

  // Parse Scenarios
  const scenarios: Scenario[] = [];
  while (!atEnd()) {
    const scenario = parseScenario();
    if (!scenario) {
      // Skip any unrecognized lines
      if (!atEnd()) advance();
      continue;
    }
    scenarios.push(scenario);
  }

  if (scenarios.length === 0) {
    throw new Error(`${source} — Feature has no scenarios`);
  }

  return {
    name: featureName,
    description: descLines.join("\n").trim(),
    tags: featureTags,
    background,
    scenarios,
  };
}
