import type { AgentContext, AgentResult, ExtractedVocab } from "@jumpchoice/shared";
import type { BaseLLMProvider } from "../llm/base-provider.js";
import { executeAgent, type AgentExecConfig } from "./agent-executor.js";

export async function executeWordExtractor(
  config: AgentExecConfig,
  context: AgentContext,
  provider: BaseLLMProvider,
  model: string,
): Promise<AgentResult> {
  const lastAssistant = [...context.recentMessages].reverse().find(m => m.role === "assistant");
  if (!lastAssistant?.content) {
    return {
      agentId: config.id,
      agentType: "word-extractor",
      type: "vocab_extraction",
      data: [],
      tokensUsed: 0,
      durationMs: 0,
      success: true,
      error: null,
    };
  }
  const result = await executeAgent(config, context, provider, model);
  if (!result.success) return result;
  const items = Array.isArray(result.data) ? (result.data as ExtractedVocab[]) : [];
  return { ...result, type: "vocab_extraction", data: items };
}
