import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = await mkdtemp(join(tmpdir(), "marinara-cyoa-campaign-"));
process.env.DATA_DIR = dataDir;

const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
const { cyoaDocuments, cyoaBuilds, cyoaChoices, messages, chats } = await import("../../packages/server/src/db/schema/index.js");
const { cyoaRoutes } = await import("../../packages/server/src/routes/cyoa.routes.js");
const { cyoaBuildsRoutes } = await import("../../packages/server/src/routes/cyoa-builds.routes.js");
const Fastify = (await import("../../packages/server/node_modules/fastify/fastify.js")).default;
const multipart = (await import("../../packages/server/node_modules/@fastify/multipart/index.js")).default;
const { eq } = await import("../../packages/server/src/db/file-query.js");

const db = await createFileNativeDB();

async function buildApp() {
  const app = Fastify();
  await app.register(multipart);
  app.decorate("db", db);
  await app.register(cyoaRoutes, { prefix: "/api/cyoa" });
  await app.register(cyoaBuildsRoutes, { prefix: "/api/cyoa" });
  await app.ready();
  return app;
}

async function seedDocument(overrides: Record<string, unknown> = {}) {
  await db
    .insert(cyoaDocuments)
    .values({
      id: "doc1",
      name: "Might & Magic",
      description: "",
      status: "analyzed",
      pointBudget: null,
      metadata: "{}",
      extractions: "[]",
      reviewedExtractions: "[]",
      mergedDocument: "{}",
      analysis: "{}",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    })
    .run();
}

async function seedBuild(overrides: Record<string, unknown> = {}) {
  await db
    .insert(cyoaBuilds)
    .values({
      id: "build1",
      documentId: "doc1",
      name: "My Hero",
      description: "A brave soul",
      selectedChoiceIds: "[]",
      notes: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    })
    .run();
}

async function seedChoice(overrides: Record<string, unknown> = {}) {
  await db
    .insert(cyoaChoices)
    .values({
      id: "c1",
      documentId: "doc1",
      category: "magic",
      name: "Fireball",
      description: "Hurl fire",
      pointCost: 5,
      prerequisites: "[]",
      tags: "[]",
      tier: null,
      costEfficiency: null,
      synergyIds: "[]",
      analysisText: "",
      sourceImageIds: "[]",
      metadata: "{}",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    })
    .run();
}

async function seedMessage(id: string, extra: string, createdAt: string) {
  await db
    .insert(messages)
    .values({ id, chatId: "chat1", role: "assistant", content: "", extra, createdAt })
    .run();
}

try {
  await seedDocument({
    pointBudget: 100,
    analysis: JSON.stringify({
      topSynergies: [{ choiceIds: ["c1", "c2"], description: "Fire and steel", combinedValue: "high" }],
    }),
  });

  // ── Builds CRUD ──
  {
    const app = await buildApp();
    const empty = await app.inject({ method: "GET", url: "/api/cyoa/doc1/builds" });
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), []);
    await app.close();
  }
  {
    const app = await buildApp();
    const missingDoc = await app.inject({ method: "POST", url: "/api/cyoa/missing-doc/builds", payload: { name: "Build" } });
    assert.equal(missingDoc.statusCode, 404);
    assert.equal(missingDoc.json().error, "Document not found");
    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const missing = await app.inject({ method, url: "/api/cyoa/doc1/builds/nonexistent", ...(method === "PATCH" ? { payload: { name: "Updated" } } : {}) });
      assert.equal(missing.statusCode, 404);
      assert.equal(missing.json().error, "Build not found");
    }
    await app.close();
  }
  {
    const app = await buildApp();
    const created = await app.inject({ method: "POST", url: "/api/cyoa/doc1/builds", payload: { name: "My Build" } });
    assert.equal(created.statusCode, 200);
    assert.equal(created.json().name, "My Build");
    assert.deepEqual(created.json().selectedChoiceIds, []);

    const defaulted = await app.inject({ method: "POST", url: "/api/cyoa/doc1/builds", payload: {} });
    assert.equal(defaulted.statusCode, 200);
    assert.equal(defaulted.json().name, "");

    const listed = await app.inject({ method: "GET", url: "/api/cyoa/doc1/builds" });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().length, 2);
    await app.close();
  }
  await seedBuild({ selectedChoiceIds: '["c9"]', name: "Patched" });
  {
    const app = await buildApp();
    const patched = await app.inject({
      method: "PATCH",
      url: "/api/cyoa/doc1/builds/build1",
      payload: { name: "Updated Build", selectedChoiceIds: ["c1"] },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().name, "Updated Build");
    assert.deepEqual(patched.json().selectedChoiceIds, ["c1"]);

    const removed = await app.inject({ method: "DELETE", url: "/api/cyoa/doc1/builds/build1" });
    assert.equal(removed.statusCode, 200);
    assert.equal(removed.json().success, true);
    const readBack = await app.inject({ method: "GET", url: "/api/cyoa/doc1/builds/build1" });
    assert.equal(readBack.statusCode, 404);
    await app.close();
  }

  // ── POST /api/cyoa/prompts ──
  {
    const app = await buildApp();
    for (const payload of [{ buildId: "b1" }, { documentId: "d1" }, {}]) {
      const res = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload });
      assert.equal(res.statusCode, 400);
      assert.ok(String(res.json().error).includes("documentId and buildId required"));
    }
    const missingDoc = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "missing", buildId: "b1" } });
    assert.equal(missingDoc.statusCode, 404);
    assert.equal(missingDoc.json().error, "Document not found");
    await app.close();
  }
  {
    const app = await buildApp();
    const missingBuild = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "doc1", buildId: "missing" } });
    assert.equal(missingBuild.statusCode, 404);
    assert.equal(missingBuild.json().error, "Build not found");
    await app.close();
  }

  // Full prompt bundle: budget arithmetic, tone, synergies, and role structure.
  await seedBuild({ selectedChoiceIds: '["c1","c2"]' });
  await seedChoice({ id: "c1", name: "Fireball", category: "magic", pointCost: 15 });
  await seedChoice({ id: "c2", name: "Sword Mastery", category: "combat", pointCost: 10, tier: "A" });
  {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "doc1", buildId: "build1" } });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    for (const key of ["narrator", "director", "world", "characters"]) assert.ok(key in body);
    assert.ok(body.narrator.includes("My Hero"));
    assert.ok(body.narrator.includes("Fireball"));
    assert.ok(body.narrator.includes("Sword Mastery"));
    assert.ok(body.narrator.includes("25 points spent / 100 budget"));
    assert.ok(body.narrator.includes("epic fantasy"));
    assert.ok(body.narrator.includes("Fire and steel"));
    assert.ok(body.director.includes("Information Control Rules"));
    assert.ok(body.world.includes("BEHIND THE SCENES"));
    assert.ok(body.world.includes("ESCALATE"));
    assert.ok(body.characters.includes("Voice Profiles"));
    await app.close();
  }

  // Empty, malformed, and adversarial variants.
  await seedBuild({ id: "build_empty", selectedChoiceIds: "[]" });
  await seedBuild({ id: "build_broken", selectedChoiceIds: "not-valid-json" });
  {
    const app = await buildApp();
    const empty = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "doc1", buildId: "build_empty" } });
    assert.equal(empty.statusCode, 200);
    assert.ok(empty.json().narrator.includes("0 points spent"));
    assert.ok(empty.json().narrator.includes("No active synergies detected"));

    const broken = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "doc1", buildId: "build_broken" } });
    assert.equal(broken.statusCode, 200);
    assert.ok(broken.json().narrator.includes("0 points spent"));

    const adversaryOff = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1", difficulty: { adversaryEnabled: false } },
    });
    assert.equal(adversaryOff.statusCode, 200);
    assert.equal(adversaryOff.json().adversary, null);

    const adversaryOn = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1", difficulty: { adversaryEnabled: true } },
    });
    assert.equal(adversaryOn.statusCode, 200);
    assert.ok(adversaryOn.json().adversary.includes("Adversary"));

    const harsh = await app.inject({
      method: "POST",
      url: "/api/cyoa/prompts",
      payload: { documentId: "doc1", buildId: "build1", difficulty: { directorAggression: 5, worldEscalation: 5, informationLeakage: 5 } },
    });
    assert.equal(harsh.statusCode, 200);
    assert.ok(harsh.json().director.includes("Actively deceive"));
    assert.ok(harsh.json().world.includes("React immediately"));
    assert.ok(harsh.json().director.includes("Pass almost nothing"));
    await app.close();
  }

  // Malformed analysis JSON must not break prompt assembly.
  await seedDocument({ id: "doc_bad", name: "Broken", analysis: "not-json", pointBudget: null });
  await seedBuild({ id: "build_bad", documentId: "doc_bad", selectedChoiceIds: "[]" });
  {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/cyoa/prompts", payload: { documentId: "doc_bad", buildId: "build_bad" } });
    assert.equal(res.statusCode, 200);
    assert.ok(res.json().narrator.includes("No active synergies detected"));
    await app.close();
  }

  // ── GET /api/cyoa/chats/:chatId/agent-outputs ──
  await db
    .insert(chats)
    .values({ id: "chat1", name: "Campaign", mode: "conversation", createdAt: "2026-01-01T00:00:00.000Z" })
    .run();
  {
    const app = await buildApp();
    const empty = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), { outputs: [] });
    await app.close();
  }
  await seedMessage("m1", JSON.stringify({ agentType: "cyoa-world", agentOutput: "The guard is suspicious." }), "2026-01-01T00:00:00.000Z");
  await seedMessage("m2", JSON.stringify({ agentType: "cyoa-director", agentOutput: "director text" }), "2026-01-01T00:00:01.000Z");
  await seedMessage("m3", JSON.stringify({ agentType: "cyoa-adversary", agentOutput: "adversary text" }), "2026-01-01T00:00:02.000Z");
  await seedMessage("m4", JSON.stringify({ agentType: "world-state", agentOutput: "should not appear" }), "2026-01-01T00:00:03.000Z");
  await seedMessage("m5", JSON.stringify({ agentType: "cyoa-world" }), "2026-01-01T00:00:04.000Z");
  await seedMessage("m6", "not-json", "2026-01-01T00:00:05.000Z");
  {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/cyoa/chats/chat1/agent-outputs" });
    assert.equal(res.statusCode, 200);
    const outputs = res.json().outputs;
    assert.equal(outputs.length, 3);
    assert.deepEqual(
      outputs.map((o: { agentType: string }) => o.agentType),
      ["cyoa-world", "cyoa-director", "cyoa-adversary"],
    );
    assert.equal(outputs[0].text, "The guard is suspicious.");

    const otherChat = await app.inject({ method: "GET", url: "/api/cyoa/chats/other/agent-outputs" });
    assert.deepEqual(otherChat.json(), { outputs: [] });
    await app.close();
  }

  const storedBuilds = await db.select().from(cyoaBuilds).where(eq(cyoaBuilds.documentId, "doc1"));
  assert.ok(storedBuilds.length >= 2, "seeded builds must persist through the file-native store");

  process.stdout.write("CYOA campaign regression passed.\n");
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
