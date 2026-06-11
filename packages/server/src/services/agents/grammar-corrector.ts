import type { AgentContext, AgentResult, ExtractedCorrection } from "@jumpchoice/shared";
import type { BaseLLMProvider } from "../llm/base-provider.js";
import { executeAgent, type AgentExecConfig } from "./agent-executor.js";

export async function executeGrammarCorrector(
  config: AgentExecConfig,
  context: AgentContext,
  provider: BaseLLMProvider,
  model: string,
): Promise<AgentResult> {
  const lastUser = [...context.recentMessages].reverse().find(m => m.role === "user");
  if (!lastUser?.content) {
    return {
      agentId: config.id,
      agentType: "grammar-corrector",
      type: "grammar_correction",
      data: [],
      tokensUsed: 0,
      durationMs: 0,
      success: true,
      error: null,
    };
  }
  const result = await executeAgent(config, context, provider, model);
  if (!result.success) return result;
  const items = Array.isArray(result.data) ? (result.data as ExtractedCorrection[]) : [];
  return { ...result, type: "grammar_correction", data: items };
}
