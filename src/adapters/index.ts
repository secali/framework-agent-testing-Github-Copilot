// ─────────────────────────────────────────────────────────────
// Adapter Registry — maps adapter names to implementations
// ─────────────────────────────────────────────────────────────

import type { AgentAdapter } from "../types.js";
import { HttpAdapter } from "./http.adapter.js";
import { CliAdapter } from "./cli.adapter.js";
import { MockAdapter } from "./mock.adapter.js";

const builtInAdapters: Record<string, () => AgentAdapter> = {
  http: () => new HttpAdapter(),
  cli: () => new CliAdapter(),
  mock: () => new MockAdapter(),
};

const customAdapters = new Map<string, () => AgentAdapter>();

/**
 * Get an adapter by name. Checks custom adapters first, then built-in.
 */
export function getAdapter(name: string): AgentAdapter {
  const factory = customAdapters.get(name) ?? builtInAdapters[name];

  if (!factory) {
    const available = [
      ...Object.keys(builtInAdapters),
      ...customAdapters.keys(),
    ].join(", ");
    throw new Error(
      `Unknown adapter "${name}". Available adapters: ${available}`
    );
  }

  return factory();
}

/**
 * Register a custom adapter. Allows extending the framework
 * without modifying source code.
 */
export function registerAdapter(
  name: string,
  factory: () => AgentAdapter
): void {
  customAdapters.set(name, factory);
}
