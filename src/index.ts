#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// CLI Entry Point — copilot-agent-testing (cat)
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import { resolve } from "node:path";
import { loadSuites, loadSuite } from "./loader.js";
import { runSuites } from "./runner.js";
import { runFeatures, runFeatureFile, getRegisteredSteps } from "./gherkin/index.js";
import { ConsoleReporter } from "./reporters/console.reporter.js";
import { JsonReporter } from "./reporters/json.reporter.js";
import { HtmlReporter } from "./reporters/html.reporter.js";

const program = new Command();

program
  .name("cat")
  .description("🐱 Copilot Agent Testing — BDD test automation for AI agents")
  .version("1.0.0");

// ─── run command ────────────────────────────────────────────

program
  .command("run")
  .description("Run test suites (.feature or .suite.yaml)")
  .option(
    "-f, --feature <path>",
    "Path to a single .feature file"
  )
  .option(
    "-s, --suite <path>",
    "Path to a single .suite.yaml file"
  )
  .option(
    "-p, --pattern <glob>",
    "Glob pattern for test files",
    "features/**/*.feature"
  )
  .option(
    "-t, --tags <tags>",
    "Comma-separated tags to filter scenarios/tests",
    ""
  )
  .option(
    "-o, --output <path>",
    "Path for JSON report output",
    "results/report.json"
  )
  .option(
    "-v, --verbose",
    "Show detailed output for all tests",
    false
  )
  .option(
    "--html <path>",
    "Path for HTML visual report output",
    "results/report.html"
  )
  .option(
    "--no-json",
    "Disable JSON report output"
  )
  .option(
    "--var <vars...>",
    "Variables in KEY=VALUE format"
  )
  .action(async (opts) => {
    try {
      // Parse tags
      const tags = opts.tags
        ? (opts.tags as string).split(",").map((t: string) => t.trim()).filter(Boolean)
        : undefined;

      // Parse variables
      const variables: Record<string, string> = {};
      if (opts.var) {
        for (const v of opts.var as string[]) {
          const [key, ...rest] = v.split("=");
          variables[key] = rest.join("=");
        }
      }

      // Setup reporters
      const reporters = [new ConsoleReporter(opts.verbose)];
      if (opts.json !== false) {
        reporters.push(new JsonReporter(opts.output) as any);
      }
      if (opts.html) {
        reporters.push(new HtmlReporter(opts.html) as any);
      }

      let result;

      if (opts.suite) {
        // YAML suite mode
        const suites = [await loadSuite(resolve(opts.suite))];
        result = await runSuites(suites, { tags, reporters, variables });
      } else if (opts.feature) {
        // Single feature file
        result = await runFeatureFile(resolve(opts.feature), { tags, reporters, variables });
      } else {
        // Auto-detect: try .feature first, fall back to .suite.yaml
        const pattern = opts.pattern as string;

        if (pattern.endsWith(".yaml") || pattern.endsWith(".yml")) {
          const suites = await loadSuites(pattern);
          result = await runSuites(suites, { tags, reporters, variables });
        } else {
          result = await runFeatures(pattern, { tags, reporters, variables });
        }
      }

      // Exit with non-zero if any failures
      const hasFailures =
        result.summary.failed > 0 || result.summary.errors > 0;
      process.exit(hasFailures ? 1 : 0);
    } catch (err) {
      console.error(
        `\n❌ Error: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(2);
    }
  });

// ─── validate command ───────────────────────────────────────

program
  .command("validate")
  .description("Validate .feature or .suite.yaml files without running tests")
  .option("-f, --feature <path>", "Path to a single .feature file")
  .option("-s, --suite <path>", "Path to a single .suite.yaml file")
  .option("-p, --pattern <glob>", "Glob pattern", "features/**/*.feature")
  .action(async (opts) => {
    try {
      const { hasMatchingStep } = await import("./gherkin/index.js");

      if (opts.suite) {
        const suite = await loadSuite(resolve(opts.suite));
        console.log(`\n✅ Valid suite: ${suite.suite} (${suite.tests.length} tests)\n`);
      } else if (opts.feature) {
        const { parseFeatureFile } = await import("./gherkin/parser.js");
        const feature = await parseFeatureFile(resolve(opts.feature));
        const errors: string[] = [];

        // Validate Background steps
        if (feature.background) {
          for (const step of feature.background) {
            if (!hasMatchingStep(step.resolvedKeyword, step.text)) {
              errors.push(`Line ${step.line}: Undefined step "${step.resolvedKeyword} ${step.text}"`);
            }
          }
        }

        // Validate Scenario steps
        for (const scenario of feature.scenarios) {
          for (const step of scenario.steps) {
            if (!hasMatchingStep(step.resolvedKeyword, step.text)) {
              errors.push(`Line ${step.line} in scenario "${scenario.name}": Undefined step "${step.resolvedKeyword} ${step.text}"`);
            }
          }
        }

        if (errors.length > 0) {
          console.error(`\n❌ Validation failed for feature: ${feature.name}`);
          for (const err of errors) {
            console.error(`  • ${err}`);
          }
          console.error(`\nUse "cat list-steps" or check STEP_DICTIONARY.md for available steps.\n`);
          process.exit(1);
        }

        console.log(`\n✅ Valid feature: ${feature.name} (${feature.scenarios.length} scenarios) — All steps are correctly bound!\n`);
      } else {
        const { glob } = await import("glob");
        const { parseFeatureFile } = await import("./gherkin/parser.js");
        const files = await glob(opts.pattern, { absolute: true });
        let fileCount = 0;
        let totalErrors = 0;

        for (const file of files.sort()) {
          const feature = await parseFeatureFile(file);
          const errors: string[] = [];

          if (feature.background) {
            for (const step of feature.background) {
              if (!hasMatchingStep(step.resolvedKeyword, step.text)) {
                errors.push(`Line ${step.line}: Undefined step "${step.resolvedKeyword} ${step.text}"`);
              }
            }
          }

          for (const scenario of feature.scenarios) {
            for (const step of scenario.steps) {
              if (!hasMatchingStep(step.resolvedKeyword, step.text)) {
                errors.push(`Line ${step.line} in scenario "${scenario.name}": Undefined step "${step.resolvedKeyword} ${step.text}"`);
              }
            }
          }

          if (errors.length > 0) {
            const relativePath = file.replace(process.cwd() + "/", "");
            console.error(`  ❌ ${feature.name} (${relativePath})`);
            for (const err of errors) {
              console.error(`    • ${err}`);
            }
            totalErrors += errors.length;
          } else {
            console.log(`  ✅ ${feature.name} (${feature.scenarios.length} scenarios)`);
          }
          fileCount++;
        }

        if (totalErrors > 0) {
          console.error(`\n❌ Validation failed: ${totalErrors} undefined steps found across ${fileCount} files.\n`);
          process.exit(1);
        }

        console.log(`\n✅ Validated ${fileCount} feature file(s) — All steps are correctly defined!\n`);
      }
    } catch (err) {
      console.error(
        `\n❌ Validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });

// ─── list-steps command ─────────────────────────────────────

program
  .command("list-steps")
  .description("List all available step definitions")
  .action(() => {
    const steps = getRegisteredSteps();

    // Group by keyword
    const groups: Record<string, typeof steps> = { Given: [], When: [], Then: [], "*": [] };
    for (const step of steps) {
      const key = step.keyword as string;
      if (!groups[key]) groups[key] = [];
      groups[key].push(step);
    }

    console.log("\n🧩 Available Step Definitions\n");

    for (const keyword of ["Given", "When", "Then", "*"]) {
      const items = groups[keyword];
      if (!items || items.length === 0) continue;

      console.log(`  ${keyword.toUpperCase()}`);
      for (const step of items) {
        console.log(`    • ${step.description}`);
      }
      console.log();
    }

    console.log(`  Total: ${steps.length} step definitions\n`);
  });

// ─── list command ───────────────────────────────────────────

program
  .command("list")
  .description("List all scenarios in feature files")
  .option("-p, --pattern <glob>", "Glob pattern", "features/**/*.feature")
  .action(async (opts) => {
    try {
      const { glob: globFn } = await import("glob");
      const { parseFeatureFile } = await import("./gherkin/parser.js");
      const files = await globFn(opts.pattern, { absolute: true });

      for (const file of files.sort()) {
        const feature = await parseFeatureFile(file);
        const tags = feature.tags.length ? ` ${feature.tags.join(" ")}` : "";
        console.log(`\n◈ ${feature.name}${tags}`);

        for (const scenario of feature.scenarios) {
          const sTags = scenario.tags.length ? ` [${scenario.tags.join(", ")}]` : "";
          const outline = scenario.examples ? " (Outline)" : "";
          console.log(`  • ${scenario.name}${outline}${sTags}`);
        }
      }
      console.log();
    } catch (err) {
      console.error(
        `\n❌ Error: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });

program.parse();
