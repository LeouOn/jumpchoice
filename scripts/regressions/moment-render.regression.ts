// Regression: "Render this moment" (JumpChoice fork feature).
// Covers prompt assembly, preview-never-calls-a-provider, the spending cap
// (daily, total, account ceiling, ledger settle/fail) and that render sends
// exactly the confirmed prompt. Every network path is mocked: this script never
// contacts OpenRouter and never spends money.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = await mkdtemp(join(tmpdir(), "jumpchoice-moment-render-"));
process.env.DATA_DIR = dataDir;

// Belt and braces: any accidental use of global fetch fails the run loudly.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown) => {
  throw new Error(`moment-render regression attempted a real network call: ${String(input)}`);
}) as typeof fetch;

const shared = await import("../../packages/shared/src/index.js");
const {
  MOMENT_STYLE_PRESETS,
  MOMENT_FORMATS,
  MOMENT_RULES_BLOCK,
  MOMENT_REFERENCE_LINE,
  MOMENT_ESTIMATED_COST_USD,
  DEFAULT_MOMENT_RENDER_SETTINGS,
  DEFAULT_MOMENT_MODEL,
} = shared;
const { assembleMomentPrompt, readMomentCharacterCard, resolveMomentStyleText } =
  await import("../../packages/server/src/services/moment/moment-prompt.js");
const {
  summarizeMomentSpend,
  evaluateMomentCaps,
  evaluateAccountCeiling,
  createMomentSpendLedger,
  withExclusiveMomentRender,
  MomentRenderBusyError,
} = await import("../../packages/server/src/services/moment/moment-spend.js");
const { buildOpenRouterChatImageRequest, readOpenRouterUsageCost } =
  await import("../../packages/server/src/services/image/image-generation.js");
const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
const { chats, characters, momentSpendLedger, chatImages } =
  await import("../../packages/server/src/db/schema/index.js");
const { createConnectionsStorage } = await import("../../packages/server/src/services/storage/connections.storage.js");
const { momentRoutes } = await import("../../packages/server/src/routes/moment.routes.js");
const Fastify = (await import("../../packages/server/node_modules/fastify/fastify.js")).default;

const db = await createFileNativeDB();
const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

try {
  // ── 1. Prompt assembly: block order, presets, formats ──
  {
    const classic = MOMENT_STYLE_PRESETS.find((p) => p.id === "classic-pixel")!;
    assert.ok(classic.text.startsWith("Detailed 16-bit-era pixel art illustration"));
    assert.deepEqual(
      MOMENT_STYLE_PRESETS.map((p) => p.label),
      ["Classic pixel", "Hi-bit anime", "Pixel pointillism"],
    );
    assert.equal(MOMENT_FORMATS.desktop.aspectRatio, "16:9");
    assert.equal(MOMENT_FORMATS.phone.aspectRatio, "9:16");
    assert.ok(MOMENT_FORMATS.desktop.width > MOMENT_FORMATS.desktop.height);
    assert.ok(MOMENT_FORMATS.phone.height > MOMENT_FORMATS.phone.width);

    const desktop = assembleMomentPrompt({
      styleId: "classic-pixel",
      characterCard: "CARD TEXT",
      aspect: "desktop",
      scene: "SCENE TEXT",
      includeReferenceLine: true,
    });
    const blocks = desktop.split("\n\n");
    assert.deepEqual(blocks, [
      classic.text,
      "CARD TEXT",
      MOMENT_FORMATS.desktop.text,
      "SCENE TEXT",
      MOMENT_RULES_BLOCK,
      MOMENT_REFERENCE_LINE,
    ]);

    const phone = assembleMomentPrompt({
      styleId: "pixel-pointillism",
      characterCard: "CARD",
      aspect: "phone",
      scene: "",
      includeReferenceLine: false,
    });
    assert.ok(phone.includes(MOMENT_FORMATS.phone.text));
    assert.ok(!phone.includes(MOMENT_FORMATS.desktop.text));
    assert.ok(!phone.includes(MOMENT_REFERENCE_LINE), "no reference line without a reference image");
    assert.ok(phone.startsWith("Neo-pointillist pixel art."));

    assert.equal(resolveMomentStyleText("custom", "  my own style  "), "my own style");
    const custom = assembleMomentPrompt({
      styleId: "custom",
      customStyle: "MY STYLE",
      characterCard: "",
      aspect: "desktop",
      scene: "S",
      includeReferenceLine: false,
    });
    assert.ok(custom.startsWith("MY STYLE\n\n" + MOMENT_FORMATS.desktop.text));

    assert.equal(readMomentCharacterCard({ extensions: { momentCard: " moment ", appearance: "app" } }), "moment");
    assert.equal(readMomentCharacterCard({ extensions: { momentCard: "", appearance: "app" } }), "app");
    assert.equal(readMomentCharacterCard(JSON.stringify({ extensions: {} })), "");
  }

  // ── 2. OpenRouter request asks for usage; usage.cost is read ──
  {
    const body = buildOpenRouterChatImageRequest({
      prompt: "P",
      model: DEFAULT_MOMENT_MODEL,
      width: 1344,
      height: 768,
      referenceImages: [PNG_1X1],
    });
    assert.deepEqual(body.usage, { include: true });
    assert.deepEqual(body.image_config, { aspect_ratio: "16:9" });
    const content = (body.messages as Array<{ content: Array<Record<string, unknown>> }>)[0]!.content;
    assert.equal(content[0]!.type, "image_url");
    assert.deepEqual(content.at(-1), { type: "text", text: "P" });
    assert.equal(readOpenRouterUsageCost({ usage: { cost: 0.039 } }), 0.039);
    assert.equal(readOpenRouterUsageCost({ usage: {} }), undefined);
    assert.equal(readOpenRouterUsageCost({}), undefined);
  }

  // ── 3. Cap logic (pure) ──
  {
    const settings = { ...DEFAULT_MOMENT_RENDER_SETTINGS, dailyCapUsd: 0.2, totalCapUsd: 1 };
    const at = new Date(2026, 10, 2, 12, 0, 0);
    const today = new Date(2026, 10, 2, 9, 0, 0).toISOString();
    const yesterday = new Date(2026, 10, 1, 9, 0, 0).toISOString();
    const row = (createdAt: string, costUsd: number | null, status = "settled") => ({
      id: Math.random().toString(36),
      status,
      estimateUsd: MOMENT_ESTIMATED_COST_USD,
      costUsd,
      createdAt,
    });

    // Daily: 0.15 today + 0.05 estimate = 0.20 → allowed (not exceeding); one more → refused.
    let status = summarizeMomentSpend(
      [row(today, 0.1), row(today, null, "pending"), row(yesterday, 0.5)],
      settings,
      at,
    );
    assert.equal(status.todayUsd, 0.15);
    assert.equal(status.totalUsd, 0.65);
    assert.equal(status.pendingCount, 1);
    assert.equal(evaluateMomentCaps(status), null);
    status = summarizeMomentSpend([row(today, 0.16), row(yesterday, 0.5)], settings, at);
    assert.match(evaluateMomentCaps(status) ?? "", /Daily moment cap reached/);

    // Total: yesterday's spend alone pushes past the total cap.
    status = summarizeMomentSpend([row(yesterday, 0.97)], settings, at);
    assert.equal(status.todayUsd, 0);
    assert.match(evaluateMomentCaps(status) ?? "", /Total moment cap reached/);

    // Ceiling: refuse when total_usage + estimate >= ceiling.
    assert.equal(evaluateAccountCeiling(9.9, 10), null);
    assert.match(evaluateAccountCeiling(9.95, 10) ?? "", /usage ceiling reached/);
    assert.match(evaluateAccountCeiling(12, 10) ?? "", /usage ceiling reached/);

    // Defaults from the brief.
    assert.equal(DEFAULT_MOMENT_RENDER_SETTINGS.dailyCapUsd, 2);
    assert.equal(DEFAULT_MOMENT_RENDER_SETTINGS.totalCapUsd, 20);
    assert.equal(DEFAULT_MOMENT_RENDER_SETTINGS.accountUsageCeilingUsd, null);
    assert.equal(DEFAULT_MOMENT_RENDER_SETTINGS.model, "google/gemini-nano-banana-2.1");
  }

  // ── 4. Ledger: pending claim counts at the estimate, settle records provider cost, fail keeps estimate ──
  {
    const ledger = createMomentSpendLedger(db);
    const a = await ledger.claim({ chatId: "x", model: "m" });
    let status = await ledger.status(DEFAULT_MOMENT_RENDER_SETTINGS);
    assert.equal(status.totalUsd, MOMENT_ESTIMATED_COST_USD);
    assert.equal(status.pendingCount, 1);
    const settled = await ledger.settle(a, 0.012);
    assert.deepEqual(settled, { costUsd: 0.012, costSource: "provider" });
    const b = await ledger.claim({ chatId: "x", model: "m" });
    assert.deepEqual(await ledger.settle(b, undefined), { costUsd: MOMENT_ESTIMATED_COST_USD, costSource: "estimate" });
    const c = await ledger.claim({ chatId: "x", model: "m" });
    await ledger.fail(c);
    status = await ledger.status(DEFAULT_MOMENT_RENDER_SETTINGS);
    assert.equal(status.pendingCount, 0);
    assert.equal(status.totalUsd, 0.112);
    await db.delete(momentSpendLedger);
    assert.equal((await ledger.list()).length, 0);
  }

  // ── 5. Exclusive render lock ──
  {
    let release!: () => void;
    const first = withExclusiveMomentRender(() => new Promise<void>((resolve) => (release = resolve)));
    await assert.rejects(
      withExclusiveMomentRender(async () => "second"),
      MomentRenderBusyError,
    );
    release();
    await first;
    assert.equal(await withExclusiveMomentRender(async () => "after"), "after");
  }

  // ── 6. Routes: preview never calls a provider; render sends exactly the confirmed prompt ──
  {
    const iso = new Date().toISOString();
    await mkdir(join(dataDir, "avatars"), { recursive: true });
    await writeFile(join(dataDir, "avatars", "athena.png"), Buffer.from(PNG_1X1, "base64"));
    await db.insert(characters).values({
      id: "athena",
      data: JSON.stringify({
        name: "Athena",
        description: "",
        extensions: { appearance: "grey eyes", momentCard: "ATHENA MOMENT CARD" },
      }),
      avatarPath: "/api/avatars/file/athena.png",
      createdAt: iso,
      updatedAt: iso,
    });
    await db.insert(chats).values({
      id: "campaign",
      name: "Campaign",
      mode: "game",
      characterIds: JSON.stringify(["athena"]),
      metadata: "{}",
      createdAt: iso,
      updatedAt: iso,
    });
    await db.insert(chats).values({
      id: "convo",
      name: "Convo",
      mode: "conversation",
      characterIds: "[]",
      metadata: "{}",
      createdAt: iso,
      updatedAt: iso,
    });
    const connections = createConnectionsStorage(db);
    await connections.create({
      provider: "image_generation",
      name: "OpenRouter images",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-or-test-not-a-real-key",
      model: "google/gemini-2.5-flash-image",
      imagePath: null,
      maxContext: 128_000,
      isDefault: false,
      fallbackForMain: false,
      useForRandom: false,
      defaultForAgents: true,
      fallbackForAgents: false,
      enableCaching: false,
      anthropicExtendedCacheTtl: false,
      cachingAtDepth: 5,
      embeddingModel: "",
      embeddingBaseUrl: "",
      embeddingConnectionId: null,
      openrouterProvider: null,
      imageGenerationSource: "openrouter",
      comfyuiWorkflow: null,
      imageService: "openrouter",
      imageEndpointId: null,
      imagePromptInstructions: null,
      imageGenerationQuality: "auto",
      videoGenerationSource: null,
      videoService: null,
      promptPresetId: null,
      maxTokensOverride: null,
      maxParallelJobs: 1,
      treatAsLocalEndpoint: false,
      claudeFastMode: false,
    } as never);

    const generateCalls: Array<{ source: string; baseUrl: string; apiKey: string; request: Record<string, unknown> }> =
      [];
    let creditsCalls = 0;
    let creditsUsage = 1;
    let reportedCost: number | undefined = 0.039;
    const app = Fastify();
    app.decorate("db", db);
    await app.register(momentRoutes, {
      prefix: "/api/moments",
      deps: {
        generate: async (source: string, baseUrl: string, apiKey: string, _hint: string, request: never) => {
          generateCalls.push({ source, baseUrl, apiKey, request });
          return { base64: PNG_1X1, mimeType: "image/png", ext: "png", costUsd: reportedCost };
        },
        fetchCredits: async () => {
          creditsCalls += 1;
          return { totalUsage: creditsUsage, totalCredits: 50 };
        },
      },
    } as never);
    await app.ready();

    // Conversation chats are not supported.
    const convo = await app.inject({ method: "POST", url: "/api/moments/convo/preview", payload: {} });
    assert.equal(convo.statusCode, 400);

    // Preview: exact prompt, model, aspect, reference thumb, estimate — and no provider call.
    const preview = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/preview",
      payload: { styleId: "hi-bit-anime", aspect: "phone", scene: "She stands on the pier at dusk." },
    });
    assert.equal(preview.statusCode, 200, preview.body);
    const pv = preview.json();
    assert.equal(generateCalls.length, 0, "preview must never call the image provider");
    assert.equal(creditsCalls, 0, "preview must not call the network");
    assert.equal(pv.model, "google/gemini-nano-banana-2.1");
    assert.equal(pv.aspectRatio, "9:16");
    assert.equal(pv.character.name, "Athena");
    assert.equal(pv.referenceSource, "avatar");
    assert.equal(pv.referenceThumbs.length, 1);
    assert.equal(pv.estimatedCostUsd, 0.05);
    assert.equal(pv.blockedReason, null);
    assert.deepEqual(pv.prompt.split("\n\n"), [
      MOMENT_STYLE_PRESETS[1].text,
      "ATHENA MOMENT CARD",
      MOMENT_FORMATS.phone.text,
      "She stands on the pier at dusk.",
      MOMENT_RULES_BLOCK,
      MOMENT_REFERENCE_LINE,
    ]);

    // Choices are remembered per chat.
    const remembered = await app.inject({ method: "POST", url: "/api/moments/campaign/preview", payload: {} });
    assert.equal(remembered.json().styleId, "hi-bit-anime");
    assert.equal(remembered.json().aspect, "phone");
    assert.equal(generateCalls.length, 0);

    // Render requires explicit confirmation.
    const unconfirmed = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "x", aspect: "phone" },
    });
    assert.notEqual(unconfirmed.statusCode, 200);
    assert.equal(generateCalls.length, 0);

    // Render sends exactly the (edited) confirmed prompt.
    const edited = `${pv.prompt}\n\nEDITED BY USER   `;
    const render = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: edited, aspect: "phone", styleId: "hi-bit-anime", confirmed: true },
    });
    assert.equal(render.statusCode, 200, render.body);
    assert.equal(generateCalls.length, 1);
    assert.equal(generateCalls[0]!.request.prompt, edited.trim(), "render must send exactly the confirmed prompt");
    assert.equal(generateCalls[0]!.request.model, "google/gemini-nano-banana-2.1");
    assert.equal(generateCalls[0]!.request.width, MOMENT_FORMATS.phone.width);
    assert.equal(generateCalls[0]!.request.height, MOMENT_FORMATS.phone.height);
    assert.equal((generateCalls[0]!.request.referenceImages as string[]).length, 1);
    assert.equal(generateCalls[0]!.request.fallback, undefined, "moments never use a fallback connection");
    const rv = render.json();
    assert.equal(rv.costUsd, 0.039);
    assert.equal(rv.costSource, "provider");
    assert.equal(rv.image.prompt, edited.trim(), "saved image keeps its prompt");
    const saved = await db.select().from(chatImages);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].prompt, edited.trim());
    let ledgerRows = await db.select().from(momentSpendLedger);
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].status, "settled");
    assert.equal(ledgerRows[0].costUsd, 0.039);

    // No reported cost → estimate is recorded.
    reportedCost = undefined;
    const render2 = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P2", confirmed: true },
    });
    assert.equal(render2.statusCode, 200, render2.body);
    assert.equal(render2.json().costSource, "estimate");
    assert.equal(render2.json().costUsd, 0.05);

    // Daily cap refusal: set the daily cap just above today's spend.
    const capPut = await app.inject({
      method: "PUT",
      url: "/api/moments/settings",
      payload: { ...DEFAULT_MOMENT_RENDER_SETTINGS, dailyCapUsd: 0.1 },
    });
    assert.equal(capPut.statusCode, 200);
    const callsBefore = generateCalls.length;
    const refusedDaily = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P3", confirmed: true },
    });
    assert.equal(refusedDaily.statusCode, 402);
    assert.match(refusedDaily.json().error, /Daily moment cap reached/);
    assert.equal(generateCalls.length, callsBefore, "refused renders never reach the provider");
    const blockedPreview = await app.inject({ method: "POST", url: "/api/moments/campaign/preview", payload: {} });
    assert.match(blockedPreview.json().blockedReason ?? "", /Daily moment cap reached/);

    // Total cap refusal.
    await app.inject({
      method: "PUT",
      url: "/api/moments/settings",
      payload: { ...DEFAULT_MOMENT_RENDER_SETTINGS, totalCapUsd: 0.1 },
    });
    const refusedTotal = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P3", confirmed: true },
    });
    assert.equal(refusedTotal.statusCode, 402);
    assert.match(refusedTotal.json().error, /Total moment cap reached/);

    // Account ceiling: refused at the ceiling, allowed below it, fail-closed on errors.
    await app.inject({
      method: "PUT",
      url: "/api/moments/settings",
      payload: { ...DEFAULT_MOMENT_RENDER_SETTINGS, accountUsageCeilingUsd: 10 },
    });
    creditsUsage = 9.97;
    const refusedCeiling = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P4", confirmed: true },
    });
    assert.equal(refusedCeiling.statusCode, 402);
    assert.match(refusedCeiling.json().error, /usage ceiling reached/);
    assert.equal(generateCalls.length, callsBefore);
    creditsUsage = 3;
    const allowedCeiling = await app.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P4", confirmed: true },
    });
    assert.equal(allowedCeiling.statusCode, 200, allowedCeiling.body);
    assert.equal(generateCalls.length, callsBefore + 1);
    assert.ok(creditsCalls >= 2);

    // Provider failure keeps the claim at the estimate (failed, never refunded).
    const failingApp = Fastify();
    failingApp.decorate("db", db);
    await failingApp.register(momentRoutes, {
      prefix: "/api/moments",
      deps: {
        generate: async () => {
          throw new Error("provider exploded");
        },
        fetchCredits: async () => ({ totalUsage: 0, totalCredits: null }),
      },
    } as never);
    await failingApp.ready();
    const failed = await failingApp.inject({
      method: "POST",
      url: "/api/moments/campaign/render",
      payload: { prompt: "P5", confirmed: true },
    });
    assert.equal(failed.statusCode, 502);
    ledgerRows = await db.select().from(momentSpendLedger);
    const failedRow = ledgerRows.find((r: Record<string, unknown>) => r.status === "failed");
    assert.ok(failedRow, "failed render leaves a failed ledger row");
    assert.equal(failedRow.costUsd, MOMENT_ESTIMATED_COST_USD);
    await failingApp.close();

    // Settings round-trip and the key is never echoed.
    const settingsRes = await app.inject({ method: "GET", url: "/api/moments/settings" });
    assert.equal(settingsRes.statusCode, 200);
    assert.ok(!settingsRes.body.includes("sk-or-test"), "settings must never expose the API key");
    assert.ok(!preview.body.includes("sk-or-test"), "preview must never expose the API key");
    await app.close();
  }

  console.log("moment-render regression passed");
} finally {
  globalThis.fetch = realFetch;
  await rm(dataDir, { recursive: true, force: true });
}
