import assert from "node:assert/strict";
import {
  generationParametersSchema,
  isMaxVerbosityRequested,
  MAX_VERBOSITY_LENGTH_INSTRUCTION,
  MAX_VERBOSITY_OUTPUT_TOKENS,
  supportsMaxVerbosity,
  verbosityChoices,
} from "../../packages/shared/src/index.js";
import { resolveGenerationParameters } from "../../packages/server/src/services/generation/provider-generation-runtime.js";
import { resolveModelAccessPolicy } from "../../packages/server/src/services/generation/model-access-policy.js";

// JumpChoice fork: "max" verbosity is a long-form story setting for Roleplay and Game chats. It sends the provider's
// highest level ("high"), raises the output budget to the fork's long-form size, and the generate route adds a
// length instruction. Conversation chats, connection defaults and presets keep low/medium/high.

assert.equal(MAX_VERBOSITY_OUTPUT_TOKENS, 20_192, "max uses the fork's long-form output budget");
assert.ok(MAX_VERBOSITY_LENGTH_INSTRUCTION.length > 0);
assert.equal(supportsMaxVerbosity("roleplay"), true);
assert.equal(supportsMaxVerbosity("game"), true);
assert.equal(supportsMaxVerbosity("conversation"), false, "normal back-and-forth chat stays on low/medium/high");
assert.equal(supportsMaxVerbosity("agent"), false);
assert.equal(isMaxVerbosityRequested("roleplay", { verbosity: "max" }), true);
assert.equal(isMaxVerbosityRequested("roleplay", JSON.stringify({ verbosity: "max" })), true, "stored JSON is read");
assert.equal(isMaxVerbosityRequested("roleplay", { verbosity: "high" }), false);
assert.equal(isMaxVerbosityRequested("conversation", { verbosity: "max" }), false);
assert.equal(isMaxVerbosityRequested("roleplay", "{not json"), false);

const choiceValues = (allowMax?: boolean) =>
  verbosityChoices({ provider: "openai", model: "gpt-5.5" }, { allowMax }).map((choice) => choice.value);
assert.deepEqual(choiceValues(), [null, "low", "medium", "high"], "max is not offered by default");
assert.deepEqual(choiceValues(true), [null, "low", "medium", "high", "max"], "long-form surfaces offer max");

// Unsupported surfaces (connection defaults, presets, game setup) still read a legacy "max" as "high".
assert.equal(generationParametersSchema.partial().parse({ verbosity: "max" }).verbosity, "high");

const resolve = (
  chatMode: string,
  chatParameters: unknown,
  options: { defaultParameters?: unknown; maxTokensOverride?: number | null; model?: string } = {},
) => {
  const model = options.model ?? "gpt-5.5";
  return resolveGenerationParameters({
    connection: {
      provider: "openai",
      model,
      defaultParameters: options.defaultParameters ?? null,
      maxTokensOverride: options.maxTokensOverride ?? null,
    },
    chatMode,
    isSceneChat: false,
    chatParameters,
    managedParameterDefinitions: [],
    modelAccessPolicy: resolveModelAccessPolicy({ provider: "openai", model }),
    initial: {
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      topK: 0,
      minP: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      showThoughts: false,
      reasoningEffort: null,
      verbosity: null,
      serviceTier: null,
      assistantPrefill: "",
      assistantReasoningPrefill: "",
      customThinkingTags: [],
      customParameters: {},
      enabledParameters: undefined,
      stopSequences: [],
      effectiveMaxContext: undefined,
    },
  });
};

const roleplayMax = resolve("roleplay", { verbosity: "max", maxTokens: 3000 });
assert.equal(roleplayMax.maxVerbosity, true, "a saved roleplay max is honoured, not downgraded");
assert.equal(roleplayMax.verbosity, "high", "providers receive their highest level");
assert.equal(roleplayMax.maxTokens, MAX_VERBOSITY_OUTPUT_TOKENS, "max raises a smaller chat budget");
assert.equal(roleplayMax.parameterSources.maxTokens, "chat");

assert.equal(
  resolve("roleplay", JSON.stringify({ verbosity: "max", maxTokens: 40_000 })).maxTokens,
  40_000,
  "max never lowers a larger explicit budget",
);

const gameMax = resolve("game", { verbosity: "max" }, { model: "gpt-4.1", maxTokensOverride: 8000 });
assert.equal(gameMax.maxVerbosity, true);
assert.equal(gameMax.verbosity, "high");
assert.equal(gameMax.maxTokens, 8000, "the game output cap still applies after max");

const conversationMax = resolve("conversation", { verbosity: "max", maxTokens: 3000 });
assert.equal(conversationMax.maxVerbosity, false, "conversation chats do not get max");
assert.equal(conversationMax.verbosity, "high", "a conversation max reads as high");
assert.equal(conversationMax.maxTokens, 3000, "a conversation max leaves the budget alone");

const connectionMax = resolve("roleplay", {}, { defaultParameters: { verbosity: "max", maxTokens: 3000 } });
assert.equal(connectionMax.maxVerbosity, false, "max is a chat-level choice, not a connection default");
assert.equal(connectionMax.verbosity, "high");
assert.equal(connectionMax.maxTokens, 3000);

assert.equal(resolve("roleplay", { verbosity: "high" }).maxVerbosity, false);

console.log("max-verbosity regression passed");
