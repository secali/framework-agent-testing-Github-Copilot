// ─────────────────────────────────────────────────────────────
// HTTP Agent Adapter — invokes agents via HTTP endpoints
// ─────────────────────────────────────────────────────────────

import type {
  AgentAdapter,
  AgentConfig,
  AgentResponse,
  TestContext,
  ToolCall,
  FileChange,
} from "../types.js";

/**
 * Adapter for agents exposed as HTTP services (Copilot Extensions, REST APIs).
 *
 * Supports:
 *  - Standard Copilot Extension message format
 *  - Custom request/response mapping via agent.options
 *  - Bearer token and custom header authentication
 */
export class HttpAdapter implements AgentAdapter {
  name = "http";

  async invoke(
    prompt: string,
    context?: TestContext,
    config?: AgentConfig
  ): Promise<AgentResponse> {
    const endpoint = config?.endpoint;
    if (!endpoint) {
      throw new Error("HttpAdapter requires 'endpoint' in agent config");
    }

    const timeout = config?.timeout ?? 30_000;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config?.auth,
    };

    // Build request body — follows Copilot Extension message format
    const messages = this.buildMessages(prompt, context);
    const body = JSON.stringify({ messages, ...config?.options });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const start = performance.now();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      const durationMs = Math.round(performance.now() - start);
      const contentType = res.headers.get("content-type") || "";

      // If the response is an SSE stream (standard for GitHub Copilot Extensions)
      if (contentType.includes("event-stream") || !res.body) {
        if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let accumulatedText = "";
          let rawObjects: any[] = [];
          let toolCallsMap: Record<number, { name?: string; arguments: string }> = {};
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: !done });
              const lines = buffer.split("\n");
              // Keep the last partial line in the buffer
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;

                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  try {
                    const parsed = JSON.parse(dataStr);
                    rawObjects.push(parsed);

                    const delta = parsed?.choices?.[0]?.delta;
                    if (delta) {
                      if (delta.content) {
                        accumulatedText += delta.content;
                      }
                      if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                          const idx = tc.index ?? 0;
                          if (!toolCallsMap[idx]) {
                            toolCallsMap[idx] = { arguments: "" };
                          }
                          if (tc.function?.name) {
                            toolCallsMap[idx].name = tc.function.name;
                          }
                          if (tc.function?.arguments) {
                            toolCallsMap[idx].arguments += tc.function.arguments;
                          }
                        }
                      }
                    }
                  } catch {
                    // Fallback: If JSON parse fails, check if it's just raw chunked text
                    accumulatedText += trimmed + "\n";
                  }
                } else {
                  // Raw chunked text (non-SSE fallback)
                  accumulatedText += trimmed + "\n";
                }
              }
            }
          }

          // Compile tool calls from map
          const toolCalls: ToolCall[] = Object.values(toolCallsMap).map((tc) => ({
            name: tc.name || "unknown",
            arguments: (() => {
              try {
                return JSON.parse(tc.arguments);
              } catch {
                return tc.arguments || {};
              }
            })(),
          }));

          let tokenUsage;
          for (const raw of rawObjects) {
             if (raw.usage) {
               tokenUsage = {
                 promptTokens: raw.usage.prompt_tokens ?? raw.usage.promptTokens ?? 0,
                 completionTokens: raw.usage.completion_tokens ?? raw.usage.completionTokens ?? 0,
                 totalTokens: raw.usage.total_tokens ?? raw.usage.totalTokens ?? 0,
               };
             }
          }

          return {
            text: accumulatedText.trim(),
            toolCalls,
            fileChanges: [],
            statusCode: res.status,
            durationMs,
            raw: rawObjects,
            tokenUsage,
          };
        }
      }

      // Default: parse as normal JSON
      const raw = await res.json();
      return this.parseResponse(raw, res.status, durationMs);
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);

      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Agent timed out after ${timeout}ms`);
      }

      throw new Error(
        `HTTP request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private buildMessages(prompt: string, context?: TestContext) {
    const messages: Array<{ role: string; content: string }> = [];

    if (context?.systemPrompt) {
      messages.push({ role: "system", content: context.systemPrompt });
    }

    if (context?.history) {
      for (const msg of context.history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: prompt });
    return messages;
  }

  /**
   * Parses the raw HTTP response into a normalized AgentResponse.
   * Override or extend this for custom response formats.
   */
  private parseResponse(
    raw: any,
    statusCode: number,
    durationMs: number
  ): AgentResponse {
    // Handle standard OpenAI-style response
    const choice = raw?.choices?.[0];
    const text =
      choice?.message?.content ??
      raw?.message?.content ??
      raw?.content ??
      raw?.text ??
      (typeof raw === "string" ? raw : JSON.stringify(raw));

    const toolCalls: ToolCall[] = (
      choice?.message?.tool_calls ?? raw?.tool_calls ?? []
    ).map((tc: any) => ({
      name: tc.function?.name ?? tc.name,
      arguments:
        typeof tc.function?.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function?.arguments ?? tc.arguments ?? {},
    }));

    const fileChanges: FileChange[] = (raw?.file_changes ?? []).map(
      (fc: any) => ({
        path: fc.path,
        action: fc.action ?? "modified",
        content: fc.content,
      })
    );

    const tokenUsage = raw?.usage ? {
      promptTokens: raw.usage.prompt_tokens ?? raw.usage.promptTokens ?? 0,
      completionTokens: raw.usage.completion_tokens ?? raw.usage.completionTokens ?? 0,
      totalTokens: raw.usage.total_tokens ?? raw.usage.totalTokens ?? 0,
    } : undefined;

    return { text, toolCalls, fileChanges, statusCode, durationMs, raw, tokenUsage };
  }
}
