import type { AgentContext, AgentResult, CefrLevel } from "@jumpchoice/shared";
import type { BaseLLMProvider } from "../llm/base-provider.js";
import { executeAgent, type AgentExecConfig } from "./agent-executor.js";

export interface ProficiencyEstimate {
  level: CefrLevel;
  confidence: number;
  reasoning: string;
}

export async function executeProficiencyEstimator(
  config: AgentExecConfig,
  context: AgentContext,
  provider: BaseLLMProvider,
  model: string,
): Promise<AgentResult> {
  const result = await executeAgent(config, context, provider, model);
  if (!result.success) return result;
  const data = result.data as ProficiencyEstimate;
  return { ...result, type: "proficiency_estimate", data };
}
