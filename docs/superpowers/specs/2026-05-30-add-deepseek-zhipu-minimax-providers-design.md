# Spec: Add DeepSeek, Zhipu/GLM, MiniMax as First-Class Providers

**Date:** 2026-05-30
**Status:** Ready for Review
**Scope:** 6 files across 3 packages

## Problem

JumpChoice has static model lists for DeepSeek (`DEEPSEEK_MODELS`) and Zhipu/GLM (`ZAI_MODELS`) but they are **not wired to any provider type** — users can only access them via the generic `custom` provider, which requires manual base URL entry and has no dedicated model dropdown. MiniMax has no model list at all. All three providers use OpenAI-compatible APIs.

## Goal

Add `deepseek`, `zhipu`, and `minimax` as first-class provider types with dedicated base URLs, model dropdowns, and UI treatment. All three route through the existing `OpenAIProvider` class — no new provider classes needed.

## Provider Details

### DeepSeek

| Field | Value |
|-------|-------|
| `APIProvider` | `"deepseek"` |
| Base URL | `https://api.deepseek.com` |
| Models endpoint | `/models` |
| Auth | `Authorization: Bearer <key>` |
| Provider class | `OpenAIProvider("deepseek")` |
| Special support | `reasoning_content` already handled in `OpenAIProvider` |

**Current models:**
- `deepseek-v4-pro` — 1M ctx, 384K max output (flagship, thinking mode)
- `deepseek-v4-flash` — 1M ctx, 384K max output (fast, thinking mode default)
- `deepseek-chat` — 131K ctx, 8K output (legacy alias → v4-flash non-thinking, deprecated 2026/07/24)
- `deepseek-reasoner` — 131K ctx, 8K output (legacy alias → v4-flash thinking, deprecated 2026/07/24)

### Zhipu / GLM

| Field | Value |
|-------|-------|
| `APIProvider` | `"zhipu"` |
| Base URL (China) | `https://open.bigmodel.cn/api/paas/v4` |
| Base URL (US/International) | `https://api.z.ai/v1` |
| Models endpoint | `/models` |
| Auth | `Authorization: Bearer <key>` |
| Provider class | `OpenAIProvider("zhipu")` |
| Special support | `enable_thinking` for GLM models already handled in `OpenAIProvider.isNativeGLMEndpoint()` |

**Current models:**
- `glm-5.1` — 200K ctx, 128K max output (flagship)
- `glm-5-turbo` — 200K ctx, 8K output
- `glm-5` — 200K ctx, 8K output
- `glm-4.7` — 200K ctx, 8K output
- `glm-4.7-flash` — 200K ctx, 8K output
- `glm-4.7-flashx` — 200K ctx, 8K output
- `glm-4.6` — 200K ctx, 8K output
- `glm-4.6v` — 200K ctx, 8K output
- `glm-4.6v-flash` — 200K ctx, 8K output
- `glm-4.6v-flashx` — 200K ctx, 8K output
- `glm-4.5` — 128K ctx, 4K output
- `glm-4.5-air` — 128K ctx, 4K output
- `glm-4.5-x` — 128K ctx, 4K output
- `glm-4.5-airx` — 128K ctx, 4K output
- `glm-4.5-flash` — 128K ctx, 4K output
- `glm-4-32b-0414-128k` — 128K ctx, 4K output

### MiniMax

| Field | Value |
|-------|-------|
| `APIProvider` | `"minimax"` |
| Base URL | `https://api.minimaxi.com/v1` |
| Models endpoint | `/models` |
| Auth | `Authorization: Bearer <key>` |
| Provider class | `OpenAIProvider("minimax")` |
| Special support | None needed (standard OpenAI-compatible) |

**Current models:**
- `MiniMax-M2.7` — 204K ctx, 8K output (flagship, 60 TPS)
- `MiniMax-M2.7-highspeed` — 204K ctx, 8K output (fast variant, 100 TPS)
- `MiniMax-M2.5` — 204K ctx, 8K output
- `MiniMax-M2.5-highspeed` — 204K ctx, 8K output
- `MiniMax-M2.1` — 204K ctx, 8K output
- `MiniMax-M2.1-highspeed` — 204K ctx, 8K output
- `MiniMax-M2` — 204K ctx, 8K output

## Changes

### 1. `packages/shared/src/types/connection.ts`

Add three values to the `APIProvider` union:

```ts
export type APIProvider =
  | "openai"
  // ... existing ...
  | "deepseek"
  | "zhipu"
  | "minimax"
  | "image_generation";
```

### 2. `packages/shared/src/constants/providers.ts`

Add three entries to `PROVIDERS`:

```ts
deepseek: {
  id: "deepseek",
  name: "DeepSeek",
  defaultBaseUrl: "https://api.deepseek.com",
  modelsEndpoint: "/models",
  supportsStreaming: true,
  usesAuthHeader: true,
  apiKeyHeader: null,
},
zhipu: {
  id: "zhipu",
  name: "Zhipu / GLM",
  defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
  modelsEndpoint: "/models",
  supportsStreaming: true,
  usesAuthHeader: true,
  apiKeyHeader: null,
},
minimax: {
  id: "minimax",
  name: "MiniMax",
  defaultBaseUrl: "https://api.minimaxi.com/v1",
  modelsEndpoint: "/models",
  supportsStreaming: true,
  usesAuthHeader: true,
  apiKeyHeader: null,
},
```

### 3. `packages/shared/src/constants/model-lists.ts`

**Replace** `DEEPSEEK_MODELS` with current models:

```ts
export const DEEPSEEK_MODELS: KnownModel[] = [
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", context: 1000000, maxOutput: 384000 },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", context: 1000000, maxOutput: 384000 },
  { id: "deepseek-chat", name: "DeepSeek Chat (legacy)", context: 131072, maxOutput: 8192 },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner (legacy)", context: 131072, maxOutput: 8192 },
];
```

**Replace** `ZAI_MODELS` with updated list including GLM-5.1:

```ts
export const ZAI_MODELS: KnownModel[] = [
  { id: "glm-5.1", name: "GLM-5.1", context: 200000, maxOutput: 131072 },
  { id: "glm-5-turbo", name: "GLM-5 Turbo", context: 200000, maxOutput: 8192 },
  { id: "glm-5", name: "GLM-5", context: 200000, maxOutput: 8192 },
  { id: "glm-4.7", name: "GLM-4.7", context: 200000, maxOutput: 8192 },
  { id: "glm-4.7-flash", name: "GLM-4.7 Flash", context: 200000, maxOutput: 8192 },
  { id: "glm-4.7-flashx", name: "GLM-4.7 FlashX", context: 200000, maxOutput: 8192 },
  { id: "glm-4.6", name: "GLM-4.6", context: 200000, maxOutput: 8192 },
  { id: "glm-4.6v", name: "GLM-4.6V", context: 200000, maxOutput: 8192 },
  { id: "glm-4.6v-flash", name: "GLM-4.6V Flash", context: 200000, maxOutput: 8192 },
  { id: "glm-4.6v-flashx", name: "GLM-4.6V FlashX", context: 200000, maxOutput: 8192 },
  { id: "glm-4.5", name: "GLM-4.5", context: 128000, maxOutput: 4096 },
  { id: "glm-4.5-air", name: "GLM-4.5 Air", context: 128000, maxOutput: 4096 },
  { id: "glm-4.5-x", name: "GLM-4.5 X", context: 128000, maxOutput: 4096 },
  { id: "glm-4.5-airx", name: "GLM-4.5 AirX", context: 128000, maxOutput: 4096 },
  { id: "glm-4.5-flash", name: "GLM-4.5 Flash", context: 128000, maxOutput: 4096 },
  { id: "glm-4-32b-0414-128k", name: "GLM-4 32B (128K)", context: 128000, maxOutput: 4096 },
];
```

**Add** `MINIMAX_MODELS`:

```ts
export const MINIMAX_MODELS: KnownModel[] = [
  { id: "MiniMax-M2.7", name: "MiniMax M2.7", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2.7-highspeed", name: "MiniMax M2.7 Highspeed", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2.5", name: "MiniMax M2.5", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2.5-highspeed", name: "MiniMax M2.5 Highspeed", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2.1", name: "MiniMax M2.1", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2.1-highspeed", name: "MiniMax M2.1 Highspeed", context: 204800, maxOutput: 8192 },
  { id: "MiniMax-M2", name: "MiniMax M2", context: 204800, maxOutput: 8192 },
];
```

**Add** to `MODEL_LISTS`:

```ts
export const MODEL_LISTS: Record<APIProvider, KnownModel[]> = {
  // ... existing ...
  deepseek: DEEPSEEK_MODELS,
  zhipu: ZAI_MODELS,
  minimax: MINIMAX_MODELS,
  // ... existing ...
};
```

### 4. `packages/shared/src/schemas/connection.schema.ts`

Add three values to `apiProviderSchema`:

```ts
export const apiProviderSchema = z.enum([
  // ... existing ...
  "deepseek",
  "zhipu",
  "minimax",
  // ... existing ...
]);
```

### 5. `packages/server/src/services/llm/provider-registry.ts`

Add three cases to the switch (all route to `OpenAIProvider`):

```ts
case "deepseek":
case "zhipu":
case "minimax":
  return new OpenAIProvider(
    baseUrl,
    apiKey,
    normalizedMaxContext,
    openrouterProvider,
    normalizedMaxTokensOverride,
    provider,
  );
```

### 6. `packages/client/src/components/panels/ConnectionsPanel.tsx`

Add three entries to `PROVIDER_COLORS`:

```ts
deepseek: { from: "from-blue-500", to: "to-indigo-600", ring: "ring-blue-500/40", badge: "bg-blue-500" },
zhipu: { from: "from-teal-400", to: "to-emerald-500", ring: "ring-teal-400/40", badge: "bg-teal-400" },
minimax: { from: "from-amber-400", to: "to-orange-500", ring: "ring-amber-400/40", badge: "bg-amber-400" },
```

## What Does NOT Change

- **No new provider classes** — `OpenAIProvider` handles all three
- **Database schema** unchanged — `provider` column is text, new values are valid
- **DeepSeek reasoning** — `reasoning_content` extraction already in `OpenAIProvider`
- **GLM thinking** — `enable_thinking` already in `OpenAIProvider.shouldSendGLMEnableThinking()`; the `isNativeGLMEndpoint()` method already recognizes both `open.bigmodel.cn` and `api.z.ai`
- **Client `ConnectionEditor`** — auto-renders new providers from `PROVIDERS` map (no code change needed)
- **Client `CreateConnectionModal`** — auto-renders new providers (no code change needed)

## Verification

1. `pnpm check` — lint + typecheck + build
2. `pnpm test` — all 194 tests pass
3. Manual: create a connection with each new provider, verify model dropdown populates
4. Manual: verify base URL auto-fills correctly
5. Manual: verify Zhipu US users can swap base URL to `https://api.z.ai/v1` and GLM thinking still activates
