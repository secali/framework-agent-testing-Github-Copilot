// ─────────────────────────────────────────────────────────────
// CLI Agent Adapter — invokes agents via shell commands
// ─────────────────────────────────────────────────────────────

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type {
  AgentAdapter,
  AgentConfig,
  AgentResponse,
  TestContext,
} from "../types.js";

const execAsync = promisify(exec);

/**
 * Adapter for CLI-based agents (e.g., `gh copilot`, custom CLIs).
 *
 * The prompt is passed to the command via stdin or as the last argument,
 * controlled by agent.options.inputMode ('stdin' | 'argument').
 */
export class CliAdapter implements AgentAdapter {
  name = "cli";

  async invoke(
    prompt: string,
    context?: TestContext,
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const command = config?.command;
    if (!command) {
      throw new Error("CliAdapter requires 'command' in agent config");
    }

    const timeout = config?.timeout ?? 60_000;
    const inputMode =
      (config?.options?.inputMode as string) ?? "argument";

    // Build the full command
    const fullCommand =
      inputMode === "argument"
        ? `${command} ${JSON.stringify(prompt)}`
        : command;

    const env = {
      ...process.env,
      ...config?.auth,
      AGENT_PROMPT: prompt,
      AGENT_CONTEXT: context ? JSON.stringify(context) : "",
    };

    const start = performance.now();

    try {
      const result = await execAsync(fullCommand, {
        timeout,
        env,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
        ...(inputMode === "stdin" ? { input: prompt } : {}),
      } as any);

      const stdout = String(result.stdout);
      const durationMs = Math.round(performance.now() - start);

      // Try to parse JSON output, fall back to raw text
      let raw: unknown = stdout;
      try {
        raw = JSON.parse(stdout);
      } catch {
        // Not JSON — that's fine
      }

      return {
        text: stdout.trim(),
        toolCalls: [],
        fileChanges: [],
        statusCode: 0,
        durationMs,
        raw,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);

      if (err.killed) {
        throw new Error(`CLI agent timed out after ${timeout}ms`);
      }

      // Return error output as a failed response instead of crashing
      return {
        text: err.stderr || err.message,
        toolCalls: [],
        fileChanges: [],
        statusCode: err.code ?? 1,
        durationMs,
        raw: { error: err.message, stderr: err.stderr, stdout: err.stdout },
      };
    }
  }
}
