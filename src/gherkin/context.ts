// ─────────────────────────────────────────────────────────────
// Scenario Context — shared state between steps
// ─────────────────────────────────────────────────────────────

import type { AgentConfig, AgentResponse, TestContext, EvaluatorResult } from "../types.js";

/**
 * Mutable context passed through all steps in a scenario.
 *
 * - Given steps configure agentConfig / testContext
 * - When steps invoke the agent and store the response
 * - Then steps evaluate the response and push to results
 */
export class ScenarioContext {
  agentConfig: AgentConfig = {
    adapter: "mock",
    timeout: 30_000,
  };

  testContext: TestContext = {};

  /** Variables for {{interpolation}} */
  variables: Record<string, string> = {};

  /** The response from the last When step */
  response: AgentResponse | null = null;

  /** Accumulated evaluation results from Then steps */
  results: EvaluatorResult[] = [];

  /** The prompt sent in the When step */
  prompt: string = "";

  /** Flag: has the agent been invoked? */
  get hasResponse(): boolean {
    return this.response !== null;
  }

  /** Merge env variables into the context */
  loadEnvVariables(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.variables[key] = value;
      }
    }
  }

  /** Interpolate {{variables}} in a string */
  interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return this.variables[key] ?? match;
    });
  }

  /** Reset for a new scenario (keeps config from Background) */
  resetForScenario(): void {
    this.response = null;
    this.results = [];
    this.prompt = "";
  }
}
