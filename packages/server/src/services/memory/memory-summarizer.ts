import type { ChatMessage } from "../llm/base-provider.js";
import { logger } from "../../lib/logger.js";

export const TIER2_THRESHOLD_TOKENS = 16000;
export const MIN_MESSAGES_FOR_SUMMARY = 10;
export const MAX_BATCH_MESSAGES = 15;
export const MAX_BATCH_SOURCE_TOKENS = 5000;

const SUMMARIZATION_SYSTEM_PROMPT = `You are a conversation summarizer. Produce concise, factual summaries that preserve narrative continuity.`;

const SUMMARIZATION_USER_TEMPLATE = `Summarize the following conversation excerpt in 2-4 paragraphs. Preserve:
- Key events, decisions, and their outcomes
- Character motivations and emotional states
- Important details (names, locations, items, relationships)
- Unresolved plot threads or open questions

Do NOT include:
- Greetings, pleasantries, or small talk
- Verbatim dialogue (paraphrase instead)
- Meta-commentary or OOC remarks

Conversation:
---
{messages}
---`;

export interface SummarizerMessage {
  id: string;
  role: "user" | "assistant" | "system" | "narrator";
  content: string;
  characterId?: string | null;
  createdAt: string;
}

export interface SummarizerInput {
  messages: SummarizerMessage[];
  nameMap: { userName: string; characterNames: Record<string, string> };
  provider: {
    chatComplete: (messages: ChatMessage[], options: any) => Promise<{ content: string }>;
  };
  model: string;
}

export interface SummarizerResult {
  summary: string;
  messageCount: number;
  firstMessageId: string;
  lastMessageId: string;
  firstMessageAt: string;
  lastMessageAt: string;
  tokenEstimate: number;
}

export function estimateMessageTokens(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function formatMessagesForSummary(
  messages: SummarizerMessage[],
  nameMap: { userName: string; characterNames: Record<string, string> },
): string {
  return messages
    .map((m) => {
      const name =
        m.role === "user"
          ? nameMap.userName
          : m.role === "narrator" || m.role === "system"
            ? "Narrator"
            : ((m.characterId && nameMap.characterNames[m.characterId]) ?? "Character");
      return `${name}: ${m.content}`;
    })
    .join("\n\n");
}

export async function summarizeOldestBatch(input: SummarizerInput): Promise<SummarizerResult | null> {
  const { messages, nameMap, provider, model } = input;

  const totalTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m.content), 0);
  if (totalTokens <= TIER2_THRESHOLD_TOKENS) return null;
  if (messages.length < MIN_MESSAGES_FOR_SUMMARY) return null;

  let batchEnd = 0;
  let batchTokens = 0;
  for (let i = 0; i < messages.length && i < MAX_BATCH_MESSAGES; i++) {
    const msgTokens = estimateMessageTokens(messages[i]!.content);
    if (batchTokens + msgTokens > MAX_BATCH_SOURCE_TOKENS && i >= MIN_MESSAGES_FOR_SUMMARY) break;
    batchTokens += msgTokens;
    batchEnd = i + 1;
  }
  if (batchEnd < MIN_MESSAGES_FOR_SUMMARY) {
    batchEnd = Math.min(messages.length, MAX_BATCH_MESSAGES);
  }

  const batch = messages.slice(0, batchEnd);
  const formatted = formatMessagesForSummary(batch, nameMap);
  const userPrompt = SUMMARIZATION_USER_TEMPLATE.replace("{messages}", formatted);

  try {
    const result = await provider.chatComplete(
      [
        { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { model, maxTokens: 1024 },
    );

    if (!result.content?.trim()) return null;

    logger.debug(
      "[memory-summarizer] Summarized %d messages (%d tokens → %d chars)",
      batch.length,
      batchTokens,
      result.content.length,
    );

    return {
      summary: result.content.trim(),
      messageCount: batch.length,
      firstMessageId: batch[0]!.id,
      lastMessageId: batch[batch.length - 1]!.id,
      firstMessageAt: batch[0]!.createdAt,
      lastMessageAt: batch[batch.length - 1]!.createdAt,
      tokenEstimate: batchTokens,
    };
  } catch (err) {
    logger.error(err, "[memory-summarizer] LLM summarization failed");
    return null;
  }
}
