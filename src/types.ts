// ─────────────────────────────────────────────────────────────
// Core type definitions for the Copilot Agent Testing Framework
// ─────────────────────────────────────────────────────────────

/** Result of invoking an agent */
export interface AgentResponse {
  /** Raw text output from the agent */
  text: string;
  /** Tool calls the agent made (name + arguments) */
  toolCalls: ToolCall[];
  /** Files created or modified by the agent */
  fileChanges: FileChange[];
  /** HTTP status or exit code */
  statusCode: number;
  /** Response time in milliseconds */
  durationMs: number;
  /** Raw/original response payload for custom evaluators */
  raw: unknown;
  /** Token usage statistics if provided by the agent */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface FileChange {
  path: string;
  action: "created" | "modified" | "deleted";
  content?: string;
}

// ─── Test Suite Definition (maps to YAML) ───────────────────

export interface TestSuiteDefinition {
  suite: string;
  description?: string;
  agent: AgentConfig;
  /** Shared variables available in all tests via {{variable}} */
  variables?: Record<string, string>;
  /** Setup steps run before the suite */
  setup?: SetupStep[];
  /** Teardown steps run after the suite */
  teardown?: SetupStep[];
  tests: TestCaseDefinition[];
}

export interface AgentConfig {
  /** Adapter type: 'http' | 'cli' | 'mock' */
  adapter: string;
  /** HTTP endpoint for the agent */
  endpoint?: string;
  /** CLI command to invoke the agent */
  command?: string;
  /** Headers or env vars for authentication */
  auth?: Record<string, string>;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Any adapter-specific options */
  options?: Record<string, unknown>;
}

export interface SetupStep {
  name: string;
  command: string;
}

export interface TestCaseDefinition {
  name: string;
  description?: string;
  /** The prompt or message to send to the agent */
  prompt: string;
  /** Optional context (files, conversation history) */
  context?: TestContext;
  /** List of evaluators to run against the response */
  evaluate: EvaluatorDefinition[];
  /** Tags for filtering tests */
  tags?: string[];
  /** Skip this test */
  skip?: boolean;
  /** Override agent config for this test */
  agent?: Partial<AgentConfig>;
  /** Max retries on failure */
  retries?: number;
}

export interface TestContext {
  /** Files to include as context */
  files?: string[];
  /** Conversation history (multi-turn) */
  history?: ConversationMessage[];
  /** System prompt override */
  systemPrompt?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EvaluatorDefinition {
  /** Evaluator type: 'contains' | 'not-contains' | 'regex' | 'json-schema' | 'tool-called' | 'llm-judge' | 'custom' */
  type: string;
  /** Human-readable label for the assertion */
  label?: string;
  /** Evaluator-specific configuration */
  [key: string]: unknown;
}

// ─── Results ────────────────────────────────────────────────

export type TestStatus = "passed" | "failed" | "skipped" | "error";

export interface EvaluatorResult {
  evaluator: string;
  label: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export interface TestResult {
  name: string;
  status: TestStatus;
  durationMs: number;
  prompt: string;
  response?: AgentResponse;
  evaluations: EvaluatorResult[];
  error?: string;
  retries: number;
}

export interface SuiteResult {
  suite: string;
  agent: AgentConfig;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  tests: TestResult[];
}

export interface RunResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  suites: SuiteResult[];
  summary: {
    totalSuites: number;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    passRate: string;
    totalTokens?: number;
  };
}

// ─── Plugin Interfaces ──────────────────────────────────────

/** Interface for agent adapters */
export interface AgentAdapter {
  name: string;
  invoke(prompt: string, context?: TestContext, config?: AgentConfig): Promise<AgentResponse>;
}

/** Interface for evaluators */
export interface Evaluator {
  type: string;
  evaluate(response: AgentResponse, definition: EvaluatorDefinition): Promise<EvaluatorResult>;
}

/** Interface for reporters */
export interface Reporter {
  name: string;
  onSuiteStart?(suite: TestSuiteDefinition): void;
  onTestResult?(result: TestResult): void;
  onSuiteEnd?(result: SuiteResult): void;
  onRunEnd(result: RunResult): void | Promise<void>;
}
