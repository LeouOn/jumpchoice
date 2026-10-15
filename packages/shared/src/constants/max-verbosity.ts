// JumpChoice fork: "max" verbosity for long-form story generation.
//
// "max" is a chat-level choice for Roleplay and Game chats, meant for a big
// setup or description that should come back as a long story rather than a
// chat-sized reply. No provider has a level above "high", so "max" sends
// "high", raises the output budget to the fork's long-form size, and adds a
// length instruction to the prompt. Connection defaults, presets and
// Conversation chats keep low/medium/high; a "max" saved there reads as "high".

/** Verbosity levels a long-form chat can store. */
export type ChatVerbosityLevel = "low" | "medium" | "high" | "max";

/** The minimum output budget a "max" generation gets (the fork's long-form default). */
export const MAX_VERBOSITY_OUTPUT_TOKENS = 20_192;

/** Appended to the end of the prompt when a long-form chat uses "max" verbosity. */
export const MAX_VERBOSITY_LENGTH_INSTRUCTION =
  "[Response length: maximum. Write a long, fully developed continuation that spans many paragraphs. Give scenes room to breathe with concrete detail, dialogue, inner thoughts and the passage of time, and carry the story through several beats instead of summarizing or rushing to an ending. Do not pad with repetition; keep adding new story.]";

/** Chat modes whose main reply is long-form story writing, where "max" verbosity is offered. */
export function supportsMaxVerbosity(chatMode: string | null | undefined): boolean {
  return chatMode === "roleplay" || chatMode === "game";
}

/** Whether saved chat parameters (an object or its JSON) ask for "max" verbosity in a chat mode that supports it. */
export function isMaxVerbosityRequested(chatMode: string | null | undefined, chatParameters: unknown): boolean {
  if (!supportsMaxVerbosity(chatMode)) return false;
  let parsed = chatParameters;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return false;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  return (parsed as Record<string, unknown>).verbosity === "max";
}
