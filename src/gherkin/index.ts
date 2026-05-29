// ─────────────────────────────────────────────────────────────
// Gherkin Module — public API
// ─────────────────────────────────────────────────────────────

// Re-export everything needed for external usage
export { parseFeatureFile, parseFeature } from "./parser.js";
export { ScenarioContext } from "./context.js";
export { defineStep, Given, When, Then, getRegisteredSteps, hasMatchingStep } from "./step-registry.js";
export { runFeatures, runFeatureFile } from "./runner.js";
export type { Feature, Scenario, Step } from "./types.js";

// Import to register built-in steps on module load
import "./built-in-steps.js";
