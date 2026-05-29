// ─────────────────────────────────────────────────────────────
// LLM-as-Judge Evaluator — uses an LLM to assess agent responses
// ─────────────────────────────────────────────────────────────

import type { Evaluator, EvaluatorResult, AgentResponse, EvaluatorDefinition } from "../types.js";

/**
 * YAML usage:
 *   - type: llm-judge
 *     criteria: "The response correctly explains recursion with a clear example"
 *     model: "gpt-4o"          # optional, default from env
 *     threshold: 0.7           # optional, default 0.7 (0-1 scale)
 *
 * Requires OPENAI_API_KEY environment variable.
 */
export class LlmJudgeEvaluator implements Evaluator {
  type = "llm-judge";

  async evaluate(
    response: AgentResponse,
    def: EvaluatorDefinition
  ): Promise<EvaluatorResult> {
    const criteria = def.criteria as string;
    if (!criteria) {
      return {
        evaluator: this.type,
        label: def.label ?? "llm-judge",
        passed: false,
        message: "Missing 'criteria' field in evaluator definition",
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        evaluator: this.type,
        label: def.label ?? "llm-judge",
        passed: false,
        message: "OPENAI_API_KEY not set — cannot use llm-judge evaluator",
      };
    }

    const model = (def.model as string) ?? process.env.LLM_JUDGE_MODEL ?? "gpt-4o";
    const threshold = (def.threshold as number) ?? 0.7;

    try {
      const { OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const judgePrompt = `You are an expert test evaluator. Your job is to assess whether an AI agent's response meets the given criteria.

CRITERIA:
${criteria}

AGENT'S RESPONSE:
${response.text}

Evaluate the response against the criteria and return a JSON object with:
- "score": a number from 0.0 to 1.0 (1.0 = perfectly meets criteria)
- "reasoning": a brief explanation of your assessment
- "passed": true if score >= ${threshold}, false otherwise

Return ONLY valid JSON, no other text.`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: judgePrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const judgeText = completion.choices[0]?.message?.content ?? "{}";
      const judgeResult = JSON.parse(judgeText) as {
        score: number;
        reasoning: string;
        passed: boolean;
      };

      const passed = judgeResult.score >= threshold;

      return {
        evaluator: this.type,
        label: def.label ?? `llm-judge: "${criteria.slice(0, 60)}..."`,
        passed,
        message: `Score: ${judgeResult.score.toFixed(2)} (threshold: ${threshold}) — ${judgeResult.reasoning}`,
        details: { ...judgeResult, model, threshold },
      };
    } catch (err) {
      return {
        evaluator: this.type,
        label: def.label ?? "llm-judge",
        passed: false,
        message: `LLM judge failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
