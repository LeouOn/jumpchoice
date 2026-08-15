import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = await mkdtemp(join(tmpdir(), "marinara-learning-routes-"));
process.env.DATA_DIR = dataDir;

const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
const { languages, vocabulary, srsState, srsReviews, corrections } = await import("../../packages/server/src/db/schema/learning.js");
const { learningRoutes } = await import("../../packages/server/src/routes/learning.routes.js");
const Fastify = (await import("../../packages/server/node_modules/fastify/fastify.js")).default;
const { eq } = await import("../../packages/server/src/db/file-query.js");

const db = await createFileNativeDB();

async function buildApp() {
  const app = Fastify();
  app.decorate("db", db);
  await app.register(learningRoutes, { prefix: "/api/learning" });
  await app.ready();
  return app;
}

try {
  const app = await buildApp();

  // Languages: create, list per user, set level.
  {
    const created = await app.inject({
      method: "POST",
      url: "/api/learning/languages",
      payload: { userId: "user1", name: "Japanese", code: "ja" },
    });
    assert.equal(created.statusCode, 200);
    assert.equal(created.json().code, "ja");
    assert.equal(created.json().userId, "user1");

    const listed = await app.inject({ method: "GET", url: "/api/learning/languages?userId=user1" });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().length, 1);
    assert.equal(listed.json()[0].code, "ja");

    const other = await app.inject({ method: "GET", url: "/api/learning/languages?userId=nobody" });
    assert.deepEqual(other.json(), []);

    const languageId = created.json().id;
    const leveled = await app.inject({
      method: "PATCH",
      url: `/api/learning/languages/${languageId}/level`,
      payload: { level: "B1", confidence: 0.8, source: "user_set" },
    });
    assert.equal(leveled.statusCode, 200);
    assert.equal(leveled.json().ok, true);
    const stored = await db.select().from(languages).where(eq(languages.id, languageId));
    assert.equal(stored[0]?.proficiencyLevel, "B1");
  }

  // Vocabulary: add seeds an SRS state row; listing is per user+language.
  let vocabId = "";
  {
    const added = await app.inject({
      method: "POST",
      url: "/api/learning/vocab",
      payload: {
        userId: "user1",
        languageCode: "ja",
        lemma: "taberu",
        surface: "tabemasu",
        type: "word",
        translation: "to eat",
        contextSentence: "Watashi wa ringo o tabemasu.",
        tags: ["verbs"],
      },
    });
    assert.equal(added.statusCode, 200);
    vocabId = added.json().id;
    assert.equal(added.json().lemma, "taberu");

    const srsRows = await db.select().from(srsState).where(eq(srsState.vocabularyId, vocabId));
    assert.equal(srsRows.length, 1, "adding vocabulary must initialize its SRS state");

    const listed = await app.inject({ method: "GET", url: "/api/learning/vocab?userId=user1&languageCode=ja" });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().length, 1);
    assert.equal(listed.json()[0].lemma, "taberu");

    const empty = await app.inject({ method: "GET", url: "/api/learning/vocab?userId=user1&languageCode=fr" });
    assert.deepEqual(empty.json(), []);

    const stats = await app.inject({ method: "GET", url: "/api/learning/vocab/stats?userId=user1&languageCode=ja" });
    assert.equal(stats.statusCode, 200);
  }

  // Reviews: grading records an SRS review with a computed interval.
  {
    const reviewed = await app.inject({
      method: "POST",
      url: "/api/learning/reviews",
      payload: { vocabularyIds: [vocabId], grade: 3 },
    });
    assert.equal(reviewed.statusCode, 200);
    const results = reviewed.json();
    assert.equal(results.length, 1);
    assert.ok(typeof results[0].interval === "number");

    const reviewRows = await db.select().from(srsReviews).where(eq(srsReviews.vocabularyId, vocabId));
    assert.equal(reviewRows.length, 1);
    assert.equal(reviewRows[0]?.grade, 3);

    const state = await db.select().from(srsState).where(eq(srsState.vocabularyId, vocabId));
    assert.equal(state[0]?.reps, 1, "a submitted review must advance the SRS repetition count");
  }

  // Corrections: per-chat listing and dismissal.
  {
    await db
      .insert(corrections)
      .values({
        id: "corr1",
        userId: "user1",
        languageCode: "ja",
        chatId: "chat1",
        messageId: null,
        original: "Watashi wa tabemasu",
        corrected: "Tabemasu",
        explanation: "Subject pronoun is redundant",
        severity: "minor",
        dismissed: "false",
        createdAt: "2026-01-01T00:00:00.000Z",
      })
      .run();

    const listed = await app.inject({ method: "GET", url: "/api/learning/corrections?chatId=chat1" });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().length, 1);
    assert.equal(listed.json()[0].corrected, "Tabemasu");

    const dismissed = await app.inject({ method: "PATCH", url: "/api/learning/corrections/corr1/dismiss" });
    assert.equal(dismissed.statusCode, 200);
    assert.equal(dismissed.json().ok, true);
    const stored = await db.select().from(corrections).where(eq(corrections.id, "corr1"));
    assert.equal(stored[0]?.dismissed, "true");
  }

  // Validation: malformed language codes are rejected by the schema.
  {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/learning/languages",
      payload: { userId: "user1", name: "Bad", code: "jpn" },
    });
    assert.notEqual(invalid.statusCode, 200, "a 3-letter code must fail addLanguageSchema");
  }

  await app.close();

  const vocabRows = await db.select().from(vocabulary).where(eq(vocabulary.userId, "user1"));
  assert.equal(vocabRows.length, 1);

  process.stdout.write("Learning routes regression passed.\n");
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
