import { BUILT_IN_AGENTS, nameToXmlTag, DEFAULT_AGENT_MAX_TOKENS, MAX_AGENT_MAX_TOKENS, MIN_AGENT_MAX_TOKENS } from "@jumpchoice/shared";
import type { AgentInjection } from "../../services/agents/agent-pipeline.js";
import type { BaseLLMProvider } from "../../services/llm/base-provider.js";

export const REVIEWABLE_WRITER_AGENT_TYPES = new Set(
  BUILT_IN_AGENTS.filter(
    (agent) =>
      agent.category === "writer" &&
      agent.phase === "pre_generation" &&
      !["knowledge-retrieval", "knowledge-router"].includes(agent.id),
  ).map((agent) => agent.id),
);

export type RuntimeAgentSectionType = string;

const RUNTIME_AGENT_SECTION_TOKEN_PREFIX = "__MARINARA_RUNTIME_AGENT_SECTION__";

export interface RuntimeAgentSectionTokens {
  placeholder: string;
  start: string;
  end: string;
}

export function toRuntimeAgentSectionType(
  agentType: string,
  eligibleAgentTypes: ReadonlySet<string>,
): RuntimeAgentSectionType | null {
  return eligibleAgentTypes.has(agentType) ? agentType : null;
}

export function makeRuntimeAgentSectionTokens(agentType: RuntimeAgentSectionType, nonce: string): RuntimeAgentSectionTokens {
  return {
    placeholder: `${RUNTIME_AGENT_SECTION_TOKEN_PREFIX}${nonce}__${agentType}__VALUE__`,
    start: `${RUNTIME_AGENT_SECTION_TOKEN_PREFIX}${nonce}__${agentType}__START__`,
    end: `${RUNTIME_AGENT_SECTION_TOKEN_PREFIX}${nonce}__${agentType}__END__`,
  };
}

export function replaceRuntimeAgentSection(
  messages: Array<{ content: string }>,
  tokens: RuntimeAgentSectionTokens,
  text: string,
): boolean {
  let replaced = false;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (!message.content.includes(tokens.placeholder)) continue;
    messages[i] = {
      ...message,
      content: message.content
        .split(tokens.start)
        .join("")
        .split(tokens.end)
        .join("")
        .split(tokens.placeholder)
        .join(text),
    };
    replaced = true;
  }
  return replaced;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isEmptyPromptWrapper(content: string): boolean {
  if (!content) return true;
  const xmlMatch = content.match(/^<([A-Za-z][\w.-]*)>\s*<\/\1>$/);
  if (xmlMatch) return true;
  return (
    /^#{1,6}\s+\S.*$/m.test(content) &&
    content
      .split(/\r?\n/)
      .slice(1)
      .every((line) => !line.trim())
  );
}

function pruneEmptyPromptWrappers(messages: Array<{ content: string }>): void {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i]!.content.trim();
    if (isEmptyPromptWrapper(content)) {
      messages.splice(i, 1);
    } else if (content !== messages[i]!.content) {
      messages[i] = { ...messages[i]!, content };
    }
  }
}

export function splitRuntimeHandledAgentInjections(
  messages: Array<{ content: string }>,
  tokenMap: ReadonlyMap<RuntimeAgentSectionType, RuntimeAgentSectionTokens>,
  injections: AgentInjection[],
): { fallbackInjections: AgentInjection[]; handledTypes: Set<string> } {
  const fallbackInjections: AgentInjection[] = [];
  const handledTypes = new Set<string>();
  for (const injection of injections) {
    const tokens = tokenMap.get(injection.agentType);
    const handledByPresetSection = tokens !== undefined && replaceRuntimeAgentSection(messages, tokens, injection.text);
    if (handledByPresetSection) {
      handledTypes.add(injection.agentType);
    } else {
      fallbackInjections.push(injection);
    }
  }
  return { fallbackInjections, handledTypes };
}

export function clearUnusedRuntimeAgentSections(
  messages: Array<{ content: string }>,
  tokenEntries: Iterable<[RuntimeAgentSectionType, RuntimeAgentSectionTokens]>,
): void {
  let changed = false;
  for (const [, tokens] of tokenEntries) {
    const sectionPattern = new RegExp(escapeRegExp(tokens.start) + "[\\s\\S]*?" + escapeRegExp(tokens.end), "g");
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]!;
      if (!message.content.includes(tokens.start)) continue;
      const content = message.content.replace(sectionPattern, "").trim();
      if (content) {
        messages[i] = { ...message, content };
      } else {
        messages.splice(i, 1);
      }
      changed = true;
    }
  }
  if (changed) {
    pruneEmptyPromptWrappers(messages);
  }
}

export function formatAgentInjections(injections: AgentInjection[], wrapFormat: string): string {
  if (injections.length === 1) {
    const { agentType, agentName, text } = injections[0]!;
    const label = agentName?.trim() || agentType;
    const tag = nameToXmlTag(label) || agentType.replace(/[^a-z0-9_-]/gi, "_");
    if (wrapFormat === "markdown") return `## ${label}\n${text}`;
    if (wrapFormat === "xml") return `<${tag}>\n${text}\n</${tag}>`;
    return text;
  }
  const parts: string[] = [];
  for (const { agentType, agentName, text } of injections) {
    const label = agentName?.trim() || agentType;
    const tag = nameToXmlTag(label) || agentType.replace(/[^a-z0-9_-]/gi, "_");
    if (wrapFormat === "markdown") {
      parts.push(`## ${label}\n${text}`);
    } else if (wrapFormat === "xml") {
      parts.push(`<${tag}>\n${text}\n</${tag}>`);
    } else {
      parts.push(text);
    }
  }
  return parts.join("\n\n");
}

export function normalizeAgentMaxTokens(value: unknown, fallback = DEFAULT_AGENT_MAX_TOKENS): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(MIN_AGENT_MAX_TOKENS, Math.min(MAX_AGENT_MAX_TOKENS, Math.trunc(parsed)));
}

export function applyProviderMaxTokensOverride(provider: BaseLLMProvider, maxTokens: number): number {
  return provider.maxTokensOverrideValue !== null ? Math.min(maxTokens, provider.maxTokensOverrideValue) : maxTokens;
}
