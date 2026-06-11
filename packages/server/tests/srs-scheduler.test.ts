import { describe, it, expect } from "vitest";
import { SrsScheduler } from "../src/services/learning/srs-scheduler.js";

describe("SrsScheduler.initialize", () => {
  it("returns initial state for a new item", () => {
    const state = SrsScheduler.initialize();
    expect(state.stability).toBe(1.0);
    expect(state.difficulty).toBe(5.0);
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.suspended).toBe(false);
  });

  it("nextDue is set to the provided time for new items", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    const state = SrsScheduler.initialize(now);
    expect(state.nextDue).toBe(now.toISOString());
  });
});

describe("SrsScheduler.review", () => {
  it("schedules next review after a Good grade on a new item", () => {
    const initial = SrsScheduler.initialize();
    const now = new Date("2026-06-10T12:00:00Z");
    const update = SrsScheduler.review(initial, 3, now);
    expect(update.state.reps).toBe(1);
    expect(update.state.lapses).toBe(0);
    expect(update.state.stability).toBeGreaterThan(initial.stability);
    expect(update.interval).toBeGreaterThan(0);
    expect(update.scheduledDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it("records a lapse on grade 1 (Again)", () => {
    const state = SrsScheduler.initialize();
    const update = SrsScheduler.review(state, 1);
    expect(update.state.lapses).toBe(1);
    expect(update.state.stability).toBeLessThan(state.stability);
    expect(update.state.reps).toBe(0);
  });

  it("increases stability slowly on grade 2 (Hard)", () => {
    const state = SrsScheduler.initialize();
    const update = SrsScheduler.review(state, 2);
    expect(update.state.reps).toBe(1);
    expect(update.state.stability).toBeGreaterThan(state.stability);
    expect(update.state.stability).toBeLessThan(state.stability * 2.5);
  });

  it("boosts stability and reduces difficulty on grade 4 (Easy)", () => {
    const state = SrsScheduler.initialize();
    const update = SrsScheduler.review(state, 4);
    expect(update.state.reps).toBe(1);
    expect(update.state.stability).toBeGreaterThan(state.stability * 2.5);
    expect(update.state.difficulty).toBeLessThan(state.difficulty);
  });

  it("caps interval at maximumInterval", () => {
    let state = SrsScheduler.initialize();
    for (let i = 0; i < 20; i++) {
      state = SrsScheduler.review(state, 4).state;
    }
    const update = SrsScheduler.review(state, 4);
    expect(update.interval).toBeLessThanOrEqual(365);
  });

  it("recovers from a lapse after a Good review", () => {
    let state = SrsScheduler.initialize();
    state = SrsScheduler.review(state, 1).state;
    const update = SrsScheduler.review(state, 3);
    expect(update.state.lapses).toBe(1);
    expect(update.state.reps).toBe(1);
    expect(update.state.stability).toBeGreaterThan(state.stability);
  });

  it("preserves suspended state across reviews", () => {
    const state = { ...SrsScheduler.initialize(), suspended: true };
    const update = SrsScheduler.review(state, 3);
    expect(update.state.suspended).toBe(true);
  });
});

describe("SrsScheduler.nextDue", () => {
  it("returns the scheduled nextDue date", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    const state = SrsScheduler.initialize(now);
    const due = SrsScheduler.nextDue(state);
    expect(due.toISOString()).toBe(now.toISOString());
  });
});
