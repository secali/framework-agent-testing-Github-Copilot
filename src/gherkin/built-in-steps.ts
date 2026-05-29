// ─────────────────────────────────────────────────────────────
// Built-in Step Definitions
// ─────────────────────────────────────────────────────────────
//
// This is the core "puzzle piece" library. Users compose scenarios
// from these steps without writing any code.
//
// Import this module once to register all built-in steps.
// ─────────────────────────────────────────────────────────────

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Given, When, Then } from "./step-registry.js";
import { getAdapter } from "../adapters/index.js";

/** Helper: read a file relative to cwd, with variable interpolation in the path */
async function loadFile(ctx: import("./context.js").ScenarioContext, filePath: string): Promise<string> {
  const resolved = resolve(ctx.interpolate(filePath));
  try {
    return await readFile(resolved, "utf-8");
  } catch (err) {
    throw new Error(`Cannot read file "${resolved}": ${err instanceof Error ? err.message : err}`);
  }
}

// ═══════════════════════════════════════════════════════════
//  GIVEN — Setup & Configuration
// ═══════════════════════════════════════════════════════════

// ─── Agent Adapter ──────────────────────────────────────────

Given(
  "the agent uses the {adapter} adapter",
  (ctx, [adapter]) => {
    ctx.agentConfig.adapter = adapter;
  },
  "Set the agent adapter type (http, cli, mock)"
);

Given(
  "the agent endpoint is {url}",
  (ctx, [url]) => {
    ctx.agentConfig.adapter = ctx.agentConfig.adapter || "http";
    ctx.agentConfig.endpoint = ctx.interpolate(url);
  },
  "Set the HTTP endpoint for the agent"
);

Given(
  "the agent command is {command}",
  (ctx, [command]) => {
    ctx.agentConfig.adapter = "cli";
    ctx.agentConfig.command = ctx.interpolate(command);
  },
  "Set the CLI command to invoke the agent"
);

// ─── Authentication ─────────────────────────────────────────

Given(
  "the auth header {name} is {value}",
  (ctx, [name, value]) => {
    if (!ctx.agentConfig.auth) ctx.agentConfig.auth = {};
    ctx.agentConfig.auth[name] = ctx.interpolate(value);
  },
  "Set an authentication header"
);

Given(
  "the environment variable {name} is {value}",
  (ctx, [name, value]) => {
    process.env[name] = ctx.interpolate(value);
  },
  "Set an environment variable"
);

// ─── Timeouts & Config ─────────────────────────────────────

Given(
  "the timeout is {n} milliseconds",
  (ctx, [ms]) => {
    ctx.agentConfig.timeout = parseInt(ms);
  },
  "Set the agent invocation timeout in milliseconds"
);

Given(
  "the timeout is {n} seconds",
  (ctx, [s]) => {
    ctx.agentConfig.timeout = parseFloat(s) * 1000;
  },
  "Set the agent invocation timeout in seconds"
);

// ─── Variables ──────────────────────────────────────────────

Given(
  "the variable {name} is {value}",
  (ctx, [name, value]) => {
    ctx.variables[name] = value;
  },
  "Set a variable for {{interpolation}} in prompts and steps"
);

// ─── System Prompt ──────────────────────────────────────────

Given(
  "the system prompt is {prompt}",
  (ctx, [prompt]) => {
    ctx.testContext.systemPrompt = ctx.interpolate(prompt);
  },
  "Set the system prompt (inline)"
);

Given(
  "the system prompt is:",
  (ctx, _args, step) => {
    if (!step.docString) {
      throw new Error("Step 'the system prompt is:' requires a doc string (\"\"\" block)");
    }
    ctx.testContext.systemPrompt = ctx.interpolate(step.docString);
  },
  "Set the system prompt from a multi-line doc string"
);

Given(
  "the system prompt from file {path}",
  async (ctx, [path]) => {
    ctx.testContext.systemPrompt = await loadFile(ctx, path);
  },
  "Load the system prompt from an external file"
);

// ─── Conversation History ───────────────────────────────────

Given(
  "the conversation history:",
  (ctx, _args, step) => {
    if (!step.dataTable || step.dataTable.length < 1) {
      throw new Error(
        "Step 'the conversation history:' requires a data table with | role | content | columns"
      );
    }
    ctx.testContext.history = step.dataTable.map((row) => ({
      role: row.cells[0] as "user" | "assistant",
      content: ctx.interpolate(row.cells[1]),
    }));
  },
  "Set conversation history from a data table (| role | content |)"
);

Given(
  "the previous user message was {message}",
  (ctx, [message]) => {
    if (!ctx.testContext.history) ctx.testContext.history = [];
    ctx.testContext.history.push({ role: "user", content: ctx.interpolate(message) });
  },
  "Append a user message to conversation history"
);

Given(
  "the previous assistant message was {message}",
  (ctx, [message]) => {
    if (!ctx.testContext.history) ctx.testContext.history = [];
    ctx.testContext.history.push({ role: "assistant", content: ctx.interpolate(message) });
  },
  "Append an assistant message to conversation history"
);

// ─── Mock Configuration ─────────────────────────────────────

Given(
  "the mock responds to {pattern} with {response}",
  (ctx, [pattern, response]) => {
    ctx.agentConfig.adapter = "mock";
    if (!ctx.agentConfig.options) ctx.agentConfig.options = {};
    const responses = (ctx.agentConfig.options.responses ?? {}) as Record<string, string>;
    responses[pattern] = ctx.interpolate(response);
    ctx.agentConfig.options.responses = responses;
  },
  "Configure a mock response for prompts matching a pattern"
);

Given(
  "the mock responds to {pattern} with:",
  (ctx, [pattern], step) => {
    if (!step.docString) {
      throw new Error("This step requires a doc string (\"\"\" block)");
    }
    ctx.agentConfig.adapter = "mock";
    if (!ctx.agentConfig.options) ctx.agentConfig.options = {};
    const responses = (ctx.agentConfig.options.responses ?? {}) as Record<string, string>;
    responses[pattern] = ctx.interpolate(step.docString);
    ctx.agentConfig.options.responses = responses;
  },
  "Configure a multi-line mock response"
);

Given(
  "the mock responds to {pattern} with file {path}",
  async (ctx, [pattern, path]) => {
    const content = await loadFile(ctx, path);
    ctx.agentConfig.adapter = "mock";
    if (!ctx.agentConfig.options) ctx.agentConfig.options = {};
    const responses = (ctx.agentConfig.options.responses ?? {}) as Record<string, string>;
    responses[pattern] = content;
    ctx.agentConfig.options.responses = responses;
  },
  "Load a mock response from an external file"
);

Given(
  "the mock has a delay of {n} milliseconds",
  (ctx, [ms]) => {
    ctx.agentConfig.adapter = "mock";
    if (!ctx.agentConfig.options) ctx.agentConfig.options = {};
    ctx.agentConfig.options.delay = parseInt(ms);
  },
  "Set simulated latency for mock responses"
);

// ─── Context Files ──────────────────────────────────────────

Given(
  "the context includes the file {path}",
  (ctx, [path]) => {
    if (!ctx.testContext.files) ctx.testContext.files = [];
    ctx.testContext.files.push(ctx.interpolate(path));
  },
  "Add a file to the agent context"
);


// ═══════════════════════════════════════════════════════════
//  WHEN — Agent Invocation
// ═══════════════════════════════════════════════════════════

When(
  "I send the prompt {prompt}",
  async (ctx, [prompt]) => {
    const interpolated = ctx.interpolate(prompt);
    ctx.prompt = interpolated;
    const adapter = getAdapter(ctx.agentConfig.adapter);
    ctx.response = await adapter.invoke(interpolated, ctx.testContext, ctx.agentConfig);
  },
  "Send an inline prompt to the agent"
);

When(
  "I send the prompt:",
  async (ctx, _args, step) => {
    if (!step.docString) {
      throw new Error("Step 'I send the prompt:' requires a doc string (\"\"\" block)");
    }
    const interpolated = ctx.interpolate(step.docString);
    ctx.prompt = interpolated;
    const adapter = getAdapter(ctx.agentConfig.adapter);
    ctx.response = await adapter.invoke(interpolated, ctx.testContext, ctx.agentConfig);
  },
  "Send a multi-line prompt to the agent (from doc string)"
);

When(
  "I send an empty prompt",
  async (ctx) => {
    ctx.prompt = "";
    const adapter = getAdapter(ctx.agentConfig.adapter);
    ctx.response = await adapter.invoke("", ctx.testContext, ctx.agentConfig);
  },
  "Send an empty prompt to test edge cases"
);

When(
  "I send the prompt from file {path}",
  async (ctx, [path]) => {
    const content = await loadFile(ctx, path);
    const interpolated = ctx.interpolate(content);
    ctx.prompt = interpolated;
    const adapter = getAdapter(ctx.agentConfig.adapter);
    ctx.response = await adapter.invoke(interpolated, ctx.testContext, ctx.agentConfig);
  },
  "Load and send a prompt from an external file"
);


// ═══════════════════════════════════════════════════════════
//  THEN — Assertions & Evaluations
// ═══════════════════════════════════════════════════════════

function assertHasResponse(ctx: import("./context.js").ScenarioContext): void {
  if (!ctx.hasResponse) {
    throw new Error("No agent response available. Did you forget a 'When I send the prompt' step?");
  }
}

// ─── Text Content Assertions ────────────────────────────────

Then(
  "the response contains {expected}",
  (ctx, [expected]) => {
    assertHasResponse(ctx);
    const text = ctx.response!.text.toLowerCase();
    const target = expected.toLowerCase();
    const passed = text.includes(target);
    ctx.results.push({
      evaluator: "contains",
      label: `response contains "${expected}"`,
      passed,
      message: passed
        ? `✓ Response contains "${expected}"`
        : `✗ Expected response to contain "${expected}"`,
    });
  },
  "Assert that the response text contains a substring (case-insensitive)"
);

Then(
  "the response does not contain {expected}",
  (ctx, [expected]) => {
    assertHasResponse(ctx);
    const text = ctx.response!.text.toLowerCase();
    const target = expected.toLowerCase();
    const passed = !text.includes(target);
    ctx.results.push({
      evaluator: "not-contains",
      label: `response does not contain "${expected}"`,
      passed,
      message: passed
        ? `✓ Response does not contain "${expected}"`
        : `✗ Expected response NOT to contain "${expected}"`,
    });
  },
  "Assert that the response text does NOT contain a substring"
);

Then(
  "the response contains {expected} case sensitive",
  (ctx, [expected]) => {
    assertHasResponse(ctx);
    const passed = ctx.response!.text.includes(expected);
    ctx.results.push({
      evaluator: "contains-cs",
      label: `response contains "${expected}" (case-sensitive)`,
      passed,
      message: passed
        ? `✓ Response contains "${expected}" (exact case)`
        : `✗ Expected response to contain "${expected}" (exact case)`,
    });
  },
  "Assert text contains (case-sensitive)"
);

// ─── Pattern Matching ───────────────────────────────────────

/**
 * Parse a pattern string that may optionally include flags:
 *   "def \w+\("         → RegExp("def \w+\(", "")
 *   "/def \w+\(/i"      → RegExp("def \w+\(", "i")
 *   "/pattern/gi"       → RegExp("pattern", "gi")
 */
function parsePattern(raw: string): RegExp {
  const withFlags = raw.match(/^\/(.+)\/([gimsuy]*)$/);
  if (withFlags) {
    return new RegExp(withFlags[1], withFlags[2]);
  }
  return new RegExp(raw);
}

Then(
  "the response matches the pattern {pattern}",
  (ctx, [pattern]) => {
    assertHasResponse(ctx);
    const regex = parsePattern(pattern);
    const passed = regex.test(ctx.response!.text);
    ctx.results.push({
      evaluator: "regex",
      label: `response matches ${pattern}`,
      passed,
      message: passed
        ? `✓ Response matches pattern ${pattern}`
        : `✗ Expected response to match ${pattern}`,
    });
  },
  "Assert that the response matches a regex pattern (supports /pattern/flags notation)"
);

Then(
  "the response does not match the pattern {pattern}",
  (ctx, [pattern]) => {
    assertHasResponse(ctx);
    const regex = parsePattern(pattern);
    const passed = !regex.test(ctx.response!.text);
    ctx.results.push({
      evaluator: "regex-not",
      label: `response does not match ${pattern}`,
      passed,
      message: passed
        ? `✓ Response does not match ${pattern}`
        : `✗ Expected response NOT to match ${pattern}`,
    });
  },
  "Assert that the response does NOT match a regex pattern (supports /pattern/flags notation)"
);

// ─── JSON Assertions ────────────────────────────────────────

Then(
  "the response is valid JSON",
  (ctx) => {
    assertHasResponse(ctx);
    let passed = false;
    try {
      const jsonMatch = ctx.response!.text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : ctx.response!.text;
      JSON.parse(jsonText.trim());
      passed = true;
    } catch {
      passed = false;
    }
    ctx.results.push({
      evaluator: "json-valid",
      label: "response is valid JSON",
      passed,
      message: passed
        ? "✓ Response is valid JSON"
        : "✗ Response is not valid JSON",
    });
  },
  "Assert that the response text is parseable as JSON"
);

Then(
  "the response matches the JSON schema:",
  async (ctx, _args, step) => {
    assertHasResponse(ctx);
    if (!step.docString) {
      throw new Error("This step requires a doc string with the JSON schema");
    }

    const AjvModule = await import("ajv");
    const Ajv = AjvModule.default ?? AjvModule;
    const ajv = new (Ajv as any)({ allErrors: true });

    let parsed: unknown;
    try {
      const jsonMatch = ctx.response!.text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : ctx.response!.text;
      parsed = JSON.parse(jsonText.trim());
    } catch {
      ctx.results.push({
        evaluator: "json-schema",
        label: "response matches JSON schema",
        passed: false,
        message: "✗ Response is not valid JSON — cannot validate against schema",
      });
      return;
    }

    const schema = JSON.parse(step.docString);
    const validate = ajv.compile(schema);
    const passed = validate(parsed) as boolean;

    ctx.results.push({
      evaluator: "json-schema",
      label: "response matches JSON schema",
      passed,
      message: passed
        ? "✓ Response matches JSON schema"
        : `✗ JSON schema validation failed: ${ajv.errorsText(validate.errors)}`,
      details: passed ? undefined : validate.errors,
    });
  },
  "Assert that the response matches a JSON Schema (provided as doc string)"
);

// ─── Tool Call Assertions ───────────────────────────────────

Then(
  "the agent called the tool {tool}",
  (ctx, [tool]) => {
    assertHasResponse(ctx);
    const passed = ctx.response!.toolCalls.some((tc) => tc.name === tool);
    const called = ctx.response!.toolCalls.map((tc) => tc.name).join(", ") || "(none)";
    ctx.results.push({
      evaluator: "tool-called",
      label: `agent called tool "${tool}"`,
      passed,
      message: passed
        ? `✓ Agent called tool "${tool}"`
        : `✗ Agent did NOT call "${tool}". Called: ${called}`,
    });
  },
  "Assert that the agent invoked a specific tool"
);

Then(
  "the agent called the tool {tool} with {key} equal to {value}",
  (ctx, [tool, key, value]) => {
    assertHasResponse(ctx);
    const calls = ctx.response!.toolCalls.filter((tc) => tc.name === tool);
    const passed = calls.some(
      (tc) => String(tc.arguments[key]) === value
    );
    ctx.results.push({
      evaluator: "tool-called-args",
      label: `agent called "${tool}" with ${key}="${value}"`,
      passed,
      message: passed
        ? `✓ Agent called "${tool}" with ${key}="${value}"`
        : `✗ Agent did NOT call "${tool}" with ${key}="${value}"`,
    });
  },
  "Assert that the agent called a tool with a specific argument value"
);

Then(
  "the agent did not call the tool {tool}",
  (ctx, [tool]) => {
    assertHasResponse(ctx);
    const passed = !ctx.response!.toolCalls.some((tc) => tc.name === tool);
    ctx.results.push({
      evaluator: "tool-not-called",
      label: `agent did not call "${tool}"`,
      passed,
      message: passed
        ? `✓ Agent did not call "${tool}"`
        : `✗ Agent called "${tool}" but it should not have`,
    });
  },
  "Assert that the agent did NOT invoke a specific tool"
);

Then(
  "the agent called {n} tools",
  (ctx, [n]) => {
    assertHasResponse(ctx);
    const expected = parseInt(n);
    const actual = ctx.response!.toolCalls.length;
    const passed = actual === expected;
    ctx.results.push({
      evaluator: "tool-count",
      label: `agent called ${expected} tool(s)`,
      passed,
      message: passed
        ? `✓ Agent called exactly ${expected} tool(s)`
        : `✗ Expected ${expected} tool call(s), got ${actual}`,
    });
  },
  "Assert the total number of tool calls"
);

// ─── Status & Performance ───────────────────────────────────

Then(
  "the status code is {n}",
  (ctx, [code]) => {
    assertHasResponse(ctx);
    const expected = parseInt(code);
    const actual = ctx.response!.statusCode;
    const passed = actual === expected;
    ctx.results.push({
      evaluator: "status-code",
      label: `status code is ${expected}`,
      passed,
      message: passed
        ? `✓ Status code is ${expected}`
        : `✗ Expected status ${expected}, got ${actual}`,
    });
  },
  "Assert the HTTP status code or CLI exit code"
);

Then(
  "the response time is less than {n} milliseconds",
  (ctx, [ms]) => {
    assertHasResponse(ctx);
    const limit = parseInt(ms);
    const actual = ctx.response!.durationMs;
    const passed = actual < limit;
    ctx.results.push({
      evaluator: "response-time",
      label: `response time < ${limit}ms`,
      passed,
      message: passed
        ? `✓ Response time ${actual}ms < ${limit}ms`
        : `✗ Response time ${actual}ms exceeded limit of ${limit}ms`,
    });
  },
  "Assert that the agent responded within a time limit"
);

// ─── Word & Length Assertions ───────────────────────────────

Then(
  "the response has at least {n} words",
  (ctx, [n]) => {
    assertHasResponse(ctx);
    const min = parseInt(n);
    const count = ctx.response!.text.split(/\s+/).filter(Boolean).length;
    const passed = count >= min;
    ctx.results.push({
      evaluator: "min-words",
      label: `response has ≥ ${min} words`,
      passed,
      message: passed
        ? `✓ Response has ${count} words (≥ ${min})`
        : `✗ Response has ${count} words, expected ≥ ${min}`,
    });
  },
  "Assert minimum word count"
);

Then(
  "the response has at most {n} words",
  (ctx, [n]) => {
    assertHasResponse(ctx);
    const max = parseInt(n);
    const count = ctx.response!.text.split(/\s+/).filter(Boolean).length;
    const passed = count <= max;
    ctx.results.push({
      evaluator: "max-words",
      label: `response has ≤ ${max} words`,
      passed,
      message: passed
        ? `✓ Response has ${count} words (≤ ${max})`
        : `✗ Response has ${count} words, expected ≤ ${max}`,
    });
  },
  "Assert maximum word count"
);

Then(
  "the response is not empty",
  (ctx) => {
    assertHasResponse(ctx);
    const passed = ctx.response!.text.trim().length > 0;
    ctx.results.push({
      evaluator: "not-empty",
      label: "response is not empty",
      passed,
      message: passed
        ? "✓ Response is not empty"
        : "✗ Response is empty",
    });
  },
  "Assert that the response is not empty"
);

// ─── File Change Assertions ─────────────────────────────────

Then(
  "the agent created the file {path}",
  (ctx, [path]) => {
    assertHasResponse(ctx);
    const passed = ctx.response!.fileChanges.some(
      (fc) => fc.path === path && fc.action === "created"
    );
    ctx.results.push({
      evaluator: "file-created",
      label: `agent created "${path}"`,
      passed,
      message: passed
        ? `✓ Agent created file "${path}"`
        : `✗ Agent did NOT create file "${path}"`,
    });
  },
  "Assert that the agent created a specific file"
);

Then(
  "the agent modified the file {path}",
  (ctx, [path]) => {
    assertHasResponse(ctx);
    const passed = ctx.response!.fileChanges.some(
      (fc) => fc.path === path && fc.action === "modified"
    );
    ctx.results.push({
      evaluator: "file-modified",
      label: `agent modified "${path}"`,
      passed,
      message: passed
        ? `✓ Agent modified file "${path}"`
        : `✗ Agent did NOT modify file "${path}"`,
    });
  },
  "Assert that the agent modified a specific file"
);

Then(
  "the agent did not delete any files",
  (ctx) => {
    assertHasResponse(ctx);
    const deleted = ctx.response!.fileChanges.filter((fc) => fc.action === "deleted");
    const passed = deleted.length === 0;
    ctx.results.push({
      evaluator: "no-deletions",
      label: "agent did not delete files",
      passed,
      message: passed
        ? "✓ Agent did not delete any files"
        : `✗ Agent deleted ${deleted.length} file(s): ${deleted.map((f) => f.path).join(", ")}`,
    });
  },
  "Assert that the agent did not delete any files"
);

// ─── Expected Output from File ──────────────────────────────

Then(
  "the response matches the content of file {path}",
  async (ctx, [path]) => {
    assertHasResponse(ctx);
    const expected = (await loadFile(ctx, path)).trim();
    const actual = ctx.response!.text.trim();
    const passed = actual === expected;
    ctx.results.push({
      evaluator: "file-match",
      label: `response matches file "${path}"`,
      passed,
      message: passed
        ? `✓ Response matches content of "${path}"`
        : `✗ Response does not match content of "${path}"`,
      details: passed ? undefined : { expectedPreview: expected.slice(0, 200), actualPreview: actual.slice(0, 200) },
    });
  },
  "Assert response exactly matches the content of an external file"
);

Then(
  "the response contains the content of file {path}",
  async (ctx, [path]) => {
    assertHasResponse(ctx);
    const expected = (await loadFile(ctx, path)).trim();
    const actual = ctx.response!.text;
    const passed = actual.includes(expected);
    ctx.results.push({
      evaluator: "file-contains",
      label: `response contains file "${path}"`,
      passed,
      message: passed
        ? `✓ Response contains content of "${path}"`
        : `✗ Response does not contain content of "${path}"`,
    });
  },
  "Assert response contains the text from an external file"
);

Then(
  "the response matches the JSON schema in file {path}",
  async (ctx, [path]) => {
    assertHasResponse(ctx);
    const schemaText = await loadFile(ctx, path);
    const AjvModule = await import("ajv");
    const Ajv = AjvModule.default ?? AjvModule;
    const ajv = new (Ajv as any)({ allErrors: true });

    let parsed: unknown;
    try {
      const jsonMatch = ctx.response!.text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : ctx.response!.text;
      parsed = JSON.parse(jsonText.trim());
    } catch {
      ctx.results.push({
        evaluator: "json-schema-file",
        label: `JSON schema from "${path}"`,
        passed: false,
        message: "✗ Response is not valid JSON",
      });
      return;
    }

    const schema = JSON.parse(schemaText);
    const validate = ajv.compile(schema);
    const passed = validate(parsed) as boolean;
    ctx.results.push({
      evaluator: "json-schema-file",
      label: `JSON schema from "${path}"`,
      passed,
      message: passed
        ? `✓ Response matches JSON schema from "${path}"`
        : `✗ JSON schema validation failed: ${ajv.errorsText(validate.errors)}`,
      details: passed ? undefined : validate.errors,
    });
  },
  "Validate response against a JSON Schema loaded from a file"
);

// ─── LLM Judge ──────────────────────────────────────────────

Then(
  "an LLM judge rates the response above {n} for {criteria}",
  async (ctx, [threshold, criteria]) => {
    assertHasResponse(ctx);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: `LLM judge: "${criteria}"`,
        passed: false,
        message: "✗ OPENAI_API_KEY not set — cannot use LLM judge",
      });
      return;
    }

    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.LLM_JUDGE_MODEL ?? "gpt-4o";
    const thresholdNum = parseFloat(threshold);

    const judgePrompt = `You are an expert test evaluator. Assess whether this AI agent response meets the criteria.

CRITERIA: ${criteria}

AGENT RESPONSE:
${ctx.response!.text}

Return ONLY a JSON object: {"score": 0.0-1.0, "reasoning": "brief explanation"}`;

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: judgePrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      const passed = result.score >= thresholdNum;

      ctx.results.push({
        evaluator: "llm-judge",
        label: `LLM judge: "${criteria}"`,
        passed,
        message: `${passed ? "✓" : "✗"} Score: ${result.score?.toFixed(2)} (threshold: ${threshold}) — ${result.reasoning}`,
        details: { ...result, model, threshold: thresholdNum },
      });
    } catch (err) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: `LLM judge: "${criteria}"`,
        passed: false,
        message: `✗ LLM judge failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
  "Use an LLM to semantically evaluate the response (requires OPENAI_API_KEY)"
);

Then(
  "an LLM judge rates the response above {n} for:",
  async (ctx, [threshold], step) => {
    if (!step.docString) {
      throw new Error("This step requires a doc string with the evaluation criteria");
    }
    // Delegate to the inline version by reusing logic
    assertHasResponse(ctx);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: "LLM judge (multi-line criteria)",
        passed: false,
        message: "✗ OPENAI_API_KEY not set — cannot use LLM judge",
      });
      return;
    }

    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.LLM_JUDGE_MODEL ?? "gpt-4o";
    const thresholdNum = parseFloat(threshold);

    const judgePrompt = `You are an expert test evaluator. Assess whether this AI agent response meets the criteria.

CRITERIA:
${step.docString}

AGENT RESPONSE:
${ctx.response!.text}

Return ONLY a JSON object: {"score": 0.0-1.0, "reasoning": "brief explanation"}`;

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: judgePrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      const passed = result.score >= thresholdNum;

      ctx.results.push({
        evaluator: "llm-judge",
        label: "LLM judge (multi-line criteria)",
        passed,
        message: `${passed ? "✓" : "✗"} Score: ${result.score?.toFixed(2)} (threshold: ${threshold}) — ${result.reasoning}`,
        details: { ...result, model, threshold: thresholdNum },
      });
    } catch (err) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: "LLM judge (multi-line criteria)",
        passed: false,
        message: `✗ LLM judge failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
  "Use an LLM to evaluate the response against multi-line criteria (doc string)"
);

Then(
  "an LLM judge confirms the response is semantically equivalent to file {path}",
  async (ctx, [path]) => {
    assertHasResponse(ctx);
    const expectedContent = await loadFile(ctx, path);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: `Semantic equivalence: "${path}"`,
        passed: false,
        message: "✗ OPENAI_API_KEY not set — cannot use LLM judge",
      });
      return;
    }

    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.LLM_JUDGE_MODEL ?? "gpt-4o";

    const judgePrompt = `You are an expert semantic analyzer. Compare the AGENT RESPONSE against the EXPECTED BASELINE.
Are they semantically equivalent? Ignore formatting, whitespace, minor wording changes, or added metadata as long as the core meaning and requested output are fully present and correct.

EXPECTED BASELINE:
${expectedContent}

AGENT RESPONSE:
${ctx.response!.text}

Return ONLY a JSON object: {"equivalent": true|false, "reasoning": "brief explanation"}`;

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: judgePrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      const passed = result.equivalent === true;

      ctx.results.push({
        evaluator: "llm-judge",
        label: `Semantic equivalence: "${path}"`,
        passed,
        message: `${passed ? "✓" : "✗"} Equivalence: ${result.equivalent} — ${result.reasoning}`,
        details: { ...result, model },
      });
    } catch (err) {
      ctx.results.push({
        evaluator: "llm-judge",
        label: `Semantic equivalence: "${path}"`,
        passed: false,
        message: `✗ LLM judge failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
  "Use an LLM to evaluate if the response is semantically equivalent to an expected fixture file"
);
