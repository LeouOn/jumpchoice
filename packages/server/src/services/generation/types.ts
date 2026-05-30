import type { ServerResponse } from "http";
import type { ResolvedAgent, AgentInjection } from "../agents/agent-pipeline.js";

export interface GenerationState {
  input: any;
  chat: any;
  chatId: string;
  requestChatMode: string;
  abortController: AbortController;
  reply: any;

  connId: string;
  conn: any;
  provider: any;

  chatMeta: Record<string, unknown>;

  messages: Array<{ role: string; content: string; [key: string]: any }>;
  effectiveMaxContext: number;
  temperature: number;
  maxTokens: number;
  topP: number | undefined;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;

  personaId: string | null;
  personaName: string;
  personaDescription: string;
  personaFields: Record<string, string | undefined>;
  characterCards: Map<string, any>;

  resolvedAgents: ResolvedAgent[];
  contextInjections: AgentInjection[];

  fullResponse: string;
  fullThinking: string;
  providerThinking: string;

  generationComplete: boolean;
  clientDisconnected: boolean;
  firstSavedMsg: any | null;
  lastSavedMsg: any | null;
  pendingIllustration: Promise<void> | null;
  collectedCommands: any[];
  collectedOocMessages: string[];

  followUpIteration: number;
  runningMessagesForFollowUp: any[];

  requestDebug: boolean;
  debugLog: (message: string, ...args: any[]) => void;
  encryptedReasoningCache: Map<string, unknown[]>;

  chatMessages: any[];
  lorebookKeeperMessages: any[];
  presetId: string | undefined;
  resolvedPreset: any | null;
  presetSource: any | null;
  presetHandledLorebooks: boolean;
  chatContextEmbedding: number[] | null;
  knowledgeRouterActivationPassCompleted: boolean;
  conversationGenerationStartedAt: number | null;
  conversationAssistantSaved: boolean;
}

export interface SseEmitter {
  send(event: string, data: unknown): void;
  sendProgress(phase: string): void;
  sendToken(token: string): void;
  sendError(message: string): void;
  sendDone(): void;
  rawWrite(data: string): void;
}

export type ServiceResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };
