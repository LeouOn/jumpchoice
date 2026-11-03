// ──────────────────────────────────────────────
// Routes: "Render this moment" (JumpChoice fork feature)
// ──────────────────────────────────────────────
// Preview-then-confirm image rendering with a hard spending cap.
//   GET  /settings            → moment model, caps, and current spend
//   PUT  /settings            → update model / caps
//   POST /:chatId/scene       → draft a scene paragraph with the chat's text connection (text call only)
//   POST /:chatId/preview     → assemble the exact prompt + model + reference + cost; never calls an image provider
//   POST /:chatId/render      → send exactly the confirmed prompt, after cap checks, one render at a time
import type { FastifyInstance } from "fastify";
import {
  DEFAULT_MOMENT_STYLE_ID,
  LOCAL_SIDECAR_CONNECTION_ID,
  MOMENT_ESTIMATED_COST_USD,
  MOMENT_FORMATS,
  MOMENT_SCENE_SUMMARY_INSTRUCTION,
  MOMENT_SCENE_SUMMARY_MESSAGE_COUNT,
  momentPromptInputSchema,
  momentRenderInputSchema,
  momentRenderSettingsSchema,
  momentSceneInputSchema,
  type MomentAspect,
  type MomentPreviewResponse,
  type MomentRenderResponse,
  type MomentStyleId,
} from "@jumpchoice/shared";
import { createChatsStorage } from "../services/storage/chats.storage.js";
import { createCharactersStorage } from "../services/storage/characters.storage.js";
import { createCharacterGalleryStorage } from "../services/storage/character-gallery.storage.js";
import { createConnectionsStorage } from "../services/storage/connections.storage.js";
import { createGalleryStorage } from "../services/storage/gallery.storage.js";
import {
  generateImage,
  removeSavedImageFromDisk,
  resolveImageBackend,
  saveImageToDisk,
} from "../services/image/image-generation.js";
import { readPreferredCharacterReferenceImage } from "../services/image/illustrator-references.js";
import { storedGalleryFilename } from "../services/image/gallery-file-lifecycle.js";
import { resolveIllustratorPromptRuntime } from "../services/generation/illustrator-prompt-runtime.js";
import { resolveBaseUrl } from "./generate/generate-route-utils.js";
import {
  assembleMomentPrompt,
  isMomentAspect,
  isMomentStyleId,
  readMomentCharacterCard,
} from "../services/moment/moment-prompt.js";
import {
  createMomentSpendLedger,
  evaluateAccountCeiling,
  evaluateMomentCaps,
  fetchOpenRouterCredits,
  loadMomentRenderSettings,
  MomentRenderBusyError,
  MomentSpendRefusedError,
  saveMomentRenderSettings,
  withExclusiveMomentRender,
  type CreditsFetcher,
} from "../services/moment/moment-spend.js";
import { isDebugAgentsEnabled } from "../config/runtime-config.js";
import { logger, logDebugOverride } from "../lib/logger.js";

/** Injection points so regressions can run the routes with no network access at all. */
export type MomentRouteDeps = {
  generate?: typeof generateImage;
  fetchCredits?: CreditsFetcher;
};

const MOMENT_CHAT_MODES = new Set(["roleplay", "game"]);
const THUMB_MAX_EDGE = 256;

class MomentRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function isValidChatId(chatId: string): boolean {
  return (
    chatId.length > 0 &&
    !chatId.includes("..") &&
    !chatId.includes("/") &&
    !chatId.includes("\\") &&
    !chatId.includes("\0")
  );
}

function parseRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function parseStringArray(raw: unknown): string[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && !!entry) : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isOpenRouterBackend(backend: string, baseUrl: string): boolean {
  if (backend === "openrouter") return true;
  try {
    return new URL(baseUrl).hostname.toLowerCase().endsWith("openrouter.ai");
  } catch {
    return false;
  }
}

async function makeThumbnail(base64: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - optional native dep
    const mod = await import("sharp");
    const sharpFn = (mod.default ?? mod) as (input: Buffer) => {
      resize: (
        w: number,
        h: number,
        o: Record<string, unknown>,
      ) => { jpeg: (o: Record<string, unknown>) => { toBuffer: () => Promise<Buffer> } };
    };
    const out = await sharpFn(Buffer.from(base64, "base64"))
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    // sharp unavailable (e.g. Termux): fall back to the original bytes.
    return `data:image/png;base64,${base64}`;
  }
}

export async function momentRoutes(app: FastifyInstance, opts: { deps?: MomentRouteDeps } = {}) {
  const generate = opts.deps?.generate ?? generateImage;
  const fetchCredits = opts.deps?.fetchCredits ?? fetchOpenRouterCredits;
  const chats = createChatsStorage(app.db);
  const characters = createCharactersStorage(app.db);
  const characterGallery = createCharacterGalleryStorage(app.db);
  const connections = createConnectionsStorage(app.db);
  const gallery = createGalleryStorage(app.db);
  const ledger = createMomentSpendLedger(app.db);

  function debugLogger(debugMode: boolean | undefined) {
    const enabled = debugMode === true || isDebugAgentsEnabled();
    return (message: string, ...args: unknown[]) => logDebugOverride(enabled, message, ...args);
  }

  async function resolveChat(chatId: string) {
    if (!isValidChatId(chatId)) throw new MomentRequestError(400, "Invalid chatId");
    const chat = await chats.getById(chatId);
    if (!chat) throw new MomentRequestError(404, "Chat not found");
    if (!MOMENT_CHAT_MODES.has(chat.mode)) {
      throw new MomentRequestError(400, "Render this moment is available in Roleplay and Game chats.");
    }
    return { chat, meta: parseRecord(chat.metadata) };
  }

  async function resolveCharacter(chat: { characterIds: unknown }, meta: Record<string, unknown>, requested?: string) {
    const chatCharacterIds = parseStringArray(chat.characterIds);
    const id = requested ?? readString(meta.momentCharacterId) ?? chatCharacterIds[0] ?? null;
    if (!id) return null;
    const row = await characters.getById(id);
    if (!row) {
      if (requested) throw new MomentRequestError(404, "Character not found");
      return null;
    }
    const data = parseRecord(row.data);
    const extensions = parseRecord(data.extensions);
    return {
      id: row.id,
      name: readString(data.name) ?? "Companion",
      card: readMomentCharacterCard(data),
      avatarPath: typeof row.avatarPath === "string" ? row.avatarPath : null,
      characterSheetImageId: readString(extensions.characterSheetImageId),
      useCharacterSheetAsReference: extensions.useCharacterSheetAsReference === true,
    };
  }

  async function resolveImageConnection(meta: Record<string, unknown>, connectionId: string) {
    const candidates = [
      readString(connectionId),
      readString(meta.gameImageConnectionId),
      readString(meta.imageGenConnectionId),
    ].filter((id): id is string => !!id);
    for (const id of candidates) {
      const conn = await connections.getWithKey(id);
      if (conn && conn.provider === "image_generation") return conn;
    }
    const fallback = await connections.getDefaultForImageGeneration();
    if (!fallback) {
      throw new MomentRequestError(
        400,
        "No image connection found for moments. Add an OpenRouter image connection and set it as the default Images connection, or choose one in Settings → Generations → Image Generation → Moments.",
      );
    }
    return fallback;
  }

  /** Everything a preview or render needs. Pure reads: no provider is contacted here. */
  async function resolveMomentContext(chatId: string, input: ReturnType<typeof momentPromptInputSchema.parse>) {
    const { chat, meta } = await resolveChat(chatId);
    const settings = await loadMomentRenderSettings(app.db);
    const styleId: MomentStyleId =
      input.styleId ?? (isMomentStyleId(meta.momentStyleId) ? meta.momentStyleId : DEFAULT_MOMENT_STYLE_ID);
    const customStyle = input.customStyle ?? (typeof meta.momentCustomStyle === "string" ? meta.momentCustomStyle : "");
    const aspect: MomentAspect = input.aspect ?? (isMomentAspect(meta.momentAspect) ? meta.momentAspect : "desktop");
    const character = await resolveCharacter(chat, meta, input.characterId);
    const conn = await resolveImageConnection(meta, settings.connectionId);
    const model = settings.model.trim() || conn.model || "";
    const baseUrl = conn.baseUrl || "https://openrouter.ai/api/v1";
    const source = conn.imageGenerationSource || conn.model || "";
    const serviceHint = conn.imageService || source;
    const backend = resolveImageBackend(source, baseUrl, serviceHint, model);
    const reference = character
      ? await readPreferredCharacterReferenceImage({
          characterId: character.id,
          avatarPath: character.avatarPath,
          characterSheetImageId: character.characterSheetImageId,
          useCharacterSheetAsReference: character.useCharacterSheetAsReference,
          characterGallery,
        })
      : null;
    const format = MOMENT_FORMATS[aspect];
    const prompt = assembleMomentPrompt({
      styleId,
      customStyle,
      characterCard: character?.card ?? "",
      aspect,
      scene: input.scene,
      includeReferenceLine: !!reference,
    });
    return {
      chat,
      settings,
      styleId,
      customStyle,
      aspect,
      format,
      character,
      conn,
      model,
      baseUrl,
      source,
      serviceHint,
      backend,
      isOpenRouter: isOpenRouterBackend(backend, baseUrl),
      reference,
      prompt,
    };
  }

  type MomentContext = Awaited<ReturnType<typeof resolveMomentContext>>;

  /** Cap + optional account ceiling check. Returns a refusal reason or null. */
  async function checkSpend(context: MomentContext) {
    const spend = await ledger.status(context.settings);
    const capReason = evaluateMomentCaps(spend, MOMENT_ESTIMATED_COST_USD);
    if (capReason) return { spend, reason: capReason };
    const ceiling = context.settings.accountUsageCeilingUsd;
    if (ceiling !== null) {
      if (!context.isOpenRouter) {
        return {
          spend,
          reason:
            "An OpenRouter account usage ceiling is set, but the moment image connection is not OpenRouter, so it cannot be checked. Clear the ceiling or use an OpenRouter connection.",
        };
      }
      if (!context.conn.apiKey) {
        return {
          spend,
          reason: "The image connection has no API key, so the account usage ceiling cannot be checked.",
        };
      }
      try {
        const credits = await fetchCredits(context.conn.apiKey);
        const ceilingReason = evaluateAccountCeiling(credits.totalUsage, ceiling, MOMENT_ESTIMATED_COST_USD);
        if (ceilingReason) return { spend, reason: ceilingReason };
      } catch (err) {
        // Fail closed: when the ceiling cannot be verified, nothing is sent.
        logger.warn(err, "[moments] Could not read OpenRouter credits");
        return {
          spend,
          reason:
            "Could not check the OpenRouter account usage ceiling (the credits request failed), so nothing was sent. Try again in a moment.",
        };
      }
    }
    return { spend, reason: null as string | null };
  }

  async function rememberChoices(chatId: string, context: MomentContext) {
    await chats.patchMetadata(
      chatId,
      {
        momentStyleId: context.styleId,
        momentCustomStyle: context.customStyle,
        momentAspect: context.aspect,
        ...(context.character ? { momentCharacterId: context.character.id } : {}),
      },
      { touchUpdatedAt: false },
    );
  }

  function sendError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, err: unknown) {
    if (err instanceof MomentRequestError) return reply.status(err.statusCode).send({ error: err.message });
    if (err instanceof MomentSpendRefusedError || err instanceof MomentRenderBusyError) {
      return reply.status(err.statusCode).send({ error: err.message, refused: true });
    }
    throw err;
  }

  // ── Settings ──
  app.get("/settings", async () => {
    const settings = await loadMomentRenderSettings(app.db);
    return { settings, spend: await ledger.status(settings) };
  });

  app.put("/settings", async (req) => {
    const settings = await saveMomentRenderSettings(app.db, momentRenderSettingsSchema.parse(req.body ?? {}));
    return { settings, spend: await ledger.status(settings) };
  });

  // ── Scene draft (text connection only; never an image provider) ──
  app.post<{ Params: { chatId: string } }>("/:chatId/scene", async (req, reply) => {
    try {
      const input = momentSceneInputSchema.parse(req.body ?? {});
      const { chat, meta } = await resolveChat(req.params.chatId);
      const character = await resolveCharacter(chat, meta, input.characterId);
      const rows = await chats.listMessagePreviews(chat.id, MOMENT_SCENE_SUMMARY_MESSAGE_COUNT);
      if (rows.length === 0) throw new MomentRequestError(400, "This chat has no messages to describe yet.");
      const nameCache = new Map<string, string>();
      const lines: string[] = [];
      for (const row of rows) {
        let speaker = row.role === "user" ? "Player" : "Narrator";
        if (row.role !== "user" && row.characterId) {
          if (!nameCache.has(row.characterId)) {
            const c = await characters.getById(row.characterId);
            nameCache.set(row.characterId, readString(parseRecord(c?.data).name) ?? "Narrator");
          }
          speaker = nameCache.get(row.characterId) ?? speaker;
        }
        lines.push(`${speaker}: ${String(row.content ?? "").trim()}`);
      }
      const system = [
        `${MOMENT_SCENE_SUMMARY_INSTRUCTION}.`,
        character ? `The companion is ${character.name}.` : "",
        "Reply with the paragraph only.",
      ]
        .filter(Boolean)
        .join(" ");
      const user = `Recent story:\n\n${lines.join("\n\n")}`;

      const defaultConnection =
        chat.connectionId && chat.connectionId !== LOCAL_SIDECAR_CONNECTION_ID
          ? await connections.getWithKey(chat.connectionId)
          : null;
      let runtime;
      try {
        runtime = await resolveIllustratorPromptRuntime({
          chatMetadata: meta,
          defaultConnection,
          defaultConnectionId: chat.connectionId,
          connections,
          resolveBaseUrl,
        });
      } catch (err) {
        throw new MomentRequestError(400, err instanceof Error ? err.message : "No text connection for this chat.");
      }
      const debugLog = debugLogger(input.debugMode);
      debugLog("[debug/moments/scene] system:\n%s", system);
      debugLog("[debug/moments/scene] user:\n%s", user);
      const result = await runtime.provider.chatComplete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        {
          model: runtime.model,
          ...(runtime.suppressModelParameters ? {} : { temperature: 0.7, maxTokens: 1024 }),
          suppressModelParameters: runtime.suppressModelParameters,
          enableCaching: runtime.enableCaching,
          anthropicExtendedCacheTtl: runtime.anthropicExtendedCacheTtl,
        },
      );
      const scene = (result.content ?? "").trim();
      if (!scene) throw new MomentRequestError(502, "The text model returned an empty scene description.");
      return { scene };
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // ── Preview: the exact prompt, nothing paid ──
  app.post<{ Params: { chatId: string } }>("/:chatId/preview", async (req, reply) => {
    try {
      const input = momentPromptInputSchema.parse(req.body ?? {});
      const context = await resolveMomentContext(req.params.chatId, input);
      await rememberChoices(context.chat.id, context);
      // Preview only reports the caps from the local ledger; the account ceiling (a network
      // call) is checked at render time, right before anything is sent.
      const spend = await ledger.status(context.settings);
      const blockedReason = evaluateMomentCaps(spend, MOMENT_ESTIMATED_COST_USD);
      const response: MomentPreviewResponse = {
        prompt: context.prompt,
        model: context.model,
        connectionName: context.conn.name ?? "",
        aspect: context.aspect,
        aspectRatio: context.format.aspectRatio,
        width: context.format.width,
        height: context.format.height,
        styleId: context.styleId,
        customStyle: context.customStyle,
        character: context.character ? { id: context.character.id, name: context.character.name } : null,
        referenceThumbs: context.reference ? [await makeThumbnail(context.reference.base64)] : [],
        referenceSource: context.reference?.source ?? null,
        estimatedCostUsd: MOMENT_ESTIMATED_COST_USD,
        spend,
        blockedReason,
      };
      return response;
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // ── Render: exactly the confirmed prompt, after the cap checks ──
  app.post<{ Params: { chatId: string } }>("/:chatId/render", async (req, reply) => {
    try {
      const input = momentRenderInputSchema.parse(req.body ?? {});
      const debugLog = debugLogger(input.debugMode);
      return await withExclusiveMomentRender(async () => {
        const context = await resolveMomentContext(req.params.chatId, input);
        const { reason } = await checkSpend(context);
        if (reason) throw new MomentSpendRefusedError(reason);

        const prompt = input.prompt; // exactly what the user confirmed
        const claimId = await ledger.claim({ chatId: context.chat.id, model: context.model });
        debugLog(
          "[debug/moments/render] final image prompt (model=%s, aspect=%s, references=%d):\n%s",
          context.model,
          context.format.aspectRatio,
          context.reference ? 1 : 0,
          prompt,
        );

        let result;
        try {
          result = await generate(context.source, context.baseUrl, context.conn.apiKey || "", context.serviceHint, {
            prompt,
            model: context.model,
            width: context.format.width,
            height: context.format.height,
            referenceImages: context.reference ? [context.reference.base64] : undefined,
            imageEndpointId: context.conn.imageEndpointId || undefined,
            debugMode: input.debugMode === true || isDebugAgentsEnabled(),
            // Deliberately no fallback connection: a moment must never spend on a connection the user did not see.
          });
        } catch (err) {
          await ledger.fail(claimId);
          logger.warn(err, "[moments] Render failed for chat %s", context.chat.id);
          throw new MomentRequestError(502, err instanceof Error ? err.message : "Moment render failed");
        }
        const settled = await ledger.settle(claimId, result.costUsd);

        let filePath: string | null = null;
        try {
          filePath = saveImageToDisk(context.chat.id, result.base64, result.ext);
          const image = await gallery.create({
            chatId: context.chat.id,
            filePath,
            prompt,
            provider: context.conn.provider ?? "image_generation",
            model: context.model || "unknown",
            width: context.format.width,
            height: context.format.height,
          });
          if (!image) throw new Error("Moment image metadata could not be saved");
          await rememberChoices(context.chat.id, context);
          logger.info(
            "[moments] Rendered a moment for chat %s (cost $%s, %s)",
            context.chat.id,
            settled.costUsd.toFixed(4),
            settled.costSource,
          );
          const response: MomentRenderResponse = {
            image: {
              ...image,
              url: `/api/gallery/file/${encodeURIComponent(context.chat.id)}/${encodeURIComponent(storedGalleryFilename(filePath))}`,
            },
            costUsd: settled.costUsd,
            costSource: settled.costSource,
            spend: await ledger.status(context.settings),
          };
          return response;
        } catch (err) {
          if (filePath) removeSavedImageFromDisk(filePath);
          throw err;
        }
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
