import { FSRS_DEFAULTS } from "@jumpchoice/shared";
import type { SrsState, SrsGrade } from "@jumpchoice/shared";

export class SrsScheduler {
  static initialize(now: Date = new Date()): SrsState {
    return {
      id: "",
      vocabularyId: "",
      stability: FSRS_DEFAULTS.initialStability,
      difficulty: FSRS_DEFAULTS.initialDifficulty,
      lastReview: null,
      nextDue: now.toISOString(),
      reps: 0,
      lapses: 0,
      suspended: false,
    };
  }

  static review(
    state: SrsState,
    grade: SrsGrade,
    now: Date = new Date(),
  ): { state: SrsState; interval: number; scheduledDate: Date } {
    const params = FSRS_DEFAULTS;
    let { stability, difficulty } = state;
    let reps = state.reps;
    let lapses = state.lapses;

    if (grade === 1) {
      lapses += 1;
      stability = Math.max(0.1, stability * 0.5);
      difficulty = Math.min(10, difficulty + 1);
      reps = 0;
    } else if (grade === 2) {
      stability = stability * params.hardInterval;
      difficulty = Math.min(10, difficulty + 0.5);
      reps += 1;
    } else if (grade === 3) {
      stability = stability * 2.5;
      reps += 1;
    } else {
      stability = stability * params.easyBonus * 2.5;
      difficulty = Math.max(1, difficulty - 0.5);
      reps += 1;
    }

    const intervalDays = Math.min(stability, params.maximumInterval);
    const scheduledDate = new Date(
      now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    );

    const newState: SrsState = {
      ...state,
      stability,
      difficulty,
      reps,
      lapses,
      lastReview: now.toISOString(),
      nextDue: scheduledDate.toISOString(),
    };

    return { state: newState, interval: intervalDays, scheduledDate };
  }

  static nextDue(state: SrsState): Date {
    return new Date(state.nextDue);
  }
}
