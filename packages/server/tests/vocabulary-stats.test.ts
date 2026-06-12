import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVocabularyService } from "../src/services/learning/vocabulary-service.js";

// Mock the logger
vi.mock("../../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

/**
 * Build a mock DB whose select().from().leftJoin().where() /
 * select().from().innerJoin().where() chains return pre-configured rows.
 */
function createStatsMockDB(
  bucketRows: Record<string, number>[],
  reviewRows: Record<string, number>[],
) {
  return {
    select(_fields?: any) {
      let currentRows: any[] = [];
      let resolveRows = false;
      return {
        from(_table: any) {
          return {
            leftJoin(_t1: any, _cond: any) {
              return {
                where(_cond: any) {
                  return Promise.resolve(bucketRows);
                },
              };
            },
            innerJoin(_t1: any, _cond: any) {
              return {
                where(_cond: any) {
                  return Promise.resolve(reviewRows);
                },
              };
            },
          };
        },
      } as any;
    },
    insert() {
      return { values: () => Promise.resolve() };
    },
  } as any;
}

describe("vocabulary-service stats()", () => {
  it("stats() returns real counts from SRS state and reviews", async () => {
    // Simulate: 10 total, 3 new (reps=0), 4 learning (0<reps<3), 2 known (reps>=3, stability>=21), 5 dueToday
    const bucketRows = [
      { total: 10, newCount: 3, learning: 4, known: 2, dueToday: 5 },
    ];
    // Simulate: 12 total reviews, 9 successful (grade >= 3) → retentionRate = 9/12 = 0.75
    const reviewRows = [{ totalReviews: 12, successful: 9 }];

    const db = createStatsMockDB(bucketRows, reviewRows);
    const service = createVocabularyService(db);

    const result = await service.stats("user1", "ja");

    expect(result.total).toBe(10);
    expect(result.newCount).toBe(3);
    expect(result.learning).toBe(4);
    expect(result.known).toBe(2);
    expect(result.dueToday).toBe(5);
    expect(result.retentionRate).toBe(0.75);
  });

  it("stats() returns retentionRate 0 when there are no reviews", async () => {
    const bucketRows = [
      { total: 5, newCount: 5, learning: 0, known: 0, dueToday: 5 },
    ];
    const reviewRows = [{ totalReviews: 0, successful: 0 }];

    const db = createStatsMockDB(bucketRows, reviewRows);
    const service = createVocabularyService(db);

    const result = await service.stats("user1", "ja");

    expect(result.retentionRate).toBe(0);
    expect(result.total).toBe(5);
    expect(result.newCount).toBe(5);
  });

  it("stats() computes retentionRate as goodCount / (goodCount + badCount)", async () => {
    // 8 good, 2 bad → 8/10 = 0.8
    const bucketRows = [
      { total: 10, newCount: 0, learning: 5, known: 5, dueToday: 0 },
    ];
    const reviewRows = [{ totalReviews: 10, successful: 8 }];

    const db = createStatsMockDB(bucketRows, reviewRows);
    const service = createVocabularyService(db);

    const result = await service.stats("user1", "ja");
    expect(result.retentionRate).toBe(0.8);
  });
});
