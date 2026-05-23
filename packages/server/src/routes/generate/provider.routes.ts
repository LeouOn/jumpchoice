import type { BaseLLMProvider } from "../../services/llm/base-provider.js";
import { createLLMProvider } from "../../services/llm/provider-registry.js";
import { getLocalSidecarProvider, LOCAL_SIDECAR_MODEL } from "../../services/llm/local-sidecar.js";
import { LOCAL_SIDECAR_CONNECTION_ID } from "@jumpchoice/shared";
import { resolveBaseUrl } from "./generate-route-utils.js";

export interface ProviderContext {
  provider: BaseLLMProvider;
  model: string;
  baseUrl: string;
  maxParallelJobs: number;
}

export interface ConnectionLike {
  id: string;
  provider: string;
  baseUrl: string | null;
  apiKey: string;
  model: string;
  maxContext?: number | null;
  openrouterProvider?: string | null;
  maxTokensOverride?: number | null;
  claudeFastMode?: string | null;
  maxParallelJobs?: number | null;
}

export type AgentProviderCacheEntry = { provider: BaseLLMProvider; model: string; maxParallelJobs: number };
export type AgentProviderCache = Map<string, AgentProviderCacheEntry>;

export function createGenerationProvider(
  conn: ConnectionLike,
  baseUrl: string,
): BaseLLMProvider {
  return createLLMProvider(
    conn.provider,
    baseUrl,
    conn.apiKey,
    conn.maxContext,
    conn.openrouterProvider,
    conn.maxTokensOverride,
    conn.claudeFastMode === "true",
  );
}

export function createSummaryProvider(
  conn: ConnectionLike,
  baseUrl: string,
): BaseLLMProvider {
  return createLLMProvider(
    conn.provider,
    baseUrl,
    conn.apiKey,
    conn.maxContext,
    conn.openrouterProvider,
    conn.maxTokensOverride,
  );
}

export function seedLocalSidecarIntoCache(
  cache: AgentProviderCache,
  useForTrackers: boolean,
): void {
  if (useForTrackers) {
    cache.set(LOCAL_SIDECAR_CONNECTION_ID, {
      provider: getLocalSidecarProvider(),
      model: LOCAL_SIDECAR_MODEL,
      maxParallelJobs: 1,
    });
  }
}

export async function seedDefaultAgentConnectionIntoCache(
  cache: AgentProviderCache,
  defaultAgentConn: ConnectionLike | null | undefined,
): Promise<void> {
  if (!defaultAgentConn) return;
  const dBaseUrl = resolveBaseUrl(defaultAgentConn);
  if (!dBaseUrl) return;
  cache.set(defaultAgentConn.id, {
    provider: createLLMProvider(
      defaultAgentConn.provider,
      dBaseUrl,
      defaultAgentConn.apiKey,
      defaultAgentConn.maxContext,
      defaultAgentConn.openrouterProvider,
      defaultAgentConn.maxTokensOverride,
    ),
    model: defaultAgentConn.model,
    maxParallelJobs: Number(defaultAgentConn.maxParallelJobs) || 1,
  });
}
