// ──────────────────────────────────────────────
// Moments: hard spending cap + durable ledger (JumpChoice fork feature)
// ──────────────────────────────────────────────
// Every paid moment render goes through this sequence, one render at a time:
//   1. sum the ledger and refuse if spent + estimate would pass the daily or total cap;
//   2. if an OpenRouter account-usage ceiling is set, read /credits and refuse at the ceiling;
//   3. write a pending claim (durable on commit) BEFORE calling the provider;
//   4. settle the claim with the provider-reported cost (or the estimate).
// A crash between 3 and 4 leaves the claim pending, and pending claims count at the
// estimate, so a crash can never hand budget back.
import { eq } from "../../db/file-query.js";
import type { DB } from "../../db/connection.js";
import { momentSpendLedger } from "../../db/schema/index.js";
import { newId, now } from "../../utils/id-generator.js";
import { safeFetch } from "../../utils/security.js";
import {
  DEFAULT_MOMENT_RENDER_SETTINGS,
  MOMENT_ESTIMATED_COST_USD,
  MOMENT_RENDER_SETTINGS_KEY,
  normalizeMomentRenderSettings,
  type MomentRenderSettings,
  type MomentSpendStatus,
} from "@jumpchoice/shared";
import { createAppSettingsStorage } from "../storage/app-settings.storage.js";

export const OPENROUTER_CREDITS_URL = "https://openrouter.ai/api/v1/credits";

export class MomentSpendRefusedError extends Error {
  readonly statusCode = 402;
  constructor(message: string) {
    super(message);
    this.name = "MomentSpendRefusedError";
  }
}

export class MomentRenderBusyError extends Error {
  readonly statusCode = 409;
  constructor() {
    super("A moment is already rendering. Wait for it to finish before starting another.");
    this.name = "MomentRenderBusyError";
  }
}

export type MomentLedgerRow = {
  id: string;
  status: string;
  estimateUsd: number;
  costUsd: number | null;
  createdAt: string;
};

/** Money a ledger row counts for: its actual cost once known, else the estimate it was claimed at. */
export function ledgerRowAmount(row: Pick<MomentLedgerRow, "estimateUsd" | "costUsd">): number {
  const cost = typeof row.costUsd === "number" && Number.isFinite(row.costUsd) ? row.costUsd : null;
  const estimate = Number.isFinite(row.estimateUsd) ? row.estimateUsd : MOMENT_ESTIMATED_COST_USD;
  return Math.max(0, cost ?? estimate);
}

export function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function summarizeMomentSpend(
  rows: MomentLedgerRow[],
  settings: MomentRenderSettings,
  at: Date = new Date(),
): MomentSpendStatus {
  const dayStart = startOfLocalDay(at).getTime();
  let todayUsd = 0;
  let totalUsd = 0;
  let pendingCount = 0;
  for (const row of rows) {
    const amount = ledgerRowAmount(row);
    totalUsd += amount;
    const created = Date.parse(row.createdAt);
    // Unparseable timestamps count toward today too: never under-count.
    if (!Number.isFinite(created) || created >= dayStart) todayUsd += amount;
    if (row.status === "pending") pendingCount += 1;
  }
  return {
    todayUsd: roundUsd(todayUsd),
    totalUsd: roundUsd(totalUsd),
    dailyCapUsd: settings.dailyCapUsd,
    totalCapUsd: settings.totalCapUsd,
    accountUsageCeilingUsd: settings.accountUsageCeilingUsd,
    pendingCount,
    estimateUsd: MOMENT_ESTIMATED_COST_USD,
  };
}

/** Returns a user-facing refusal reason, or null when the caps allow one more render. */
export function evaluateMomentCaps(status: MomentSpendStatus, estimateUsd = MOMENT_ESTIMATED_COST_USD): string | null {
  const epsilon = 1e-9;
  if (status.todayUsd + estimateUsd > status.dailyCapUsd + epsilon) {
    return `Daily moment cap reached: $${status.todayUsd.toFixed(2)} spent today, the next render is estimated at $${estimateUsd.toFixed(2)} and the daily cap is $${status.dailyCapUsd.toFixed(2)}. Raise the cap in Settings → Images → Moments, or try again tomorrow.`;
  }
  if (status.totalUsd + estimateUsd > status.totalCapUsd + epsilon) {
    return `Total moment cap reached: $${status.totalUsd.toFixed(2)} spent in total, the next render is estimated at $${estimateUsd.toFixed(2)} and the total cap is $${status.totalCapUsd.toFixed(2)}. Raise the cap in Settings → Images → Moments to continue.`;
  }
  return null;
}

/** Returns a refusal reason when the OpenRouter account usage would reach the ceiling, else null. */
export function evaluateAccountCeiling(
  totalUsage: number,
  ceilingUsd: number,
  estimateUsd = MOMENT_ESTIMATED_COST_USD,
): string | null {
  if (totalUsage + estimateUsd >= ceilingUsd) {
    return `OpenRouter account usage ceiling reached: the account has used $${totalUsage.toFixed(2)} and the ceiling is $${ceilingUsd.toFixed(2)}. Raise or clear the ceiling in Settings → Images → Moments to continue.`;
  }
  return null;
}

export type CreditsFetcher = (apiKey: string) => Promise<{ totalUsage: number; totalCredits: number | null }>;

/** GET OpenRouter /credits with the connection's key. The key is only placed in the Authorization header. */
export const fetchOpenRouterCredits: CreditsFetcher = async (apiKey) => {
  const resp = await safeFetch(OPENROUTER_CREDITS_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`OpenRouter /credits returned HTTP ${resp.status}`);
  const body = (await resp.json()) as { data?: { total_usage?: unknown; total_credits?: unknown } };
  const totalUsage = Number(body.data?.total_usage);
  if (!Number.isFinite(totalUsage)) throw new Error("OpenRouter /credits response had no total_usage");
  const totalCredits = Number(body.data?.total_credits);
  return { totalUsage, totalCredits: Number.isFinite(totalCredits) ? totalCredits : null };
};

export async function loadMomentRenderSettings(db: DB): Promise<MomentRenderSettings> {
  const raw = await createAppSettingsStorage(db).get(MOMENT_RENDER_SETTINGS_KEY);
  if (!raw) return DEFAULT_MOMENT_RENDER_SETTINGS;
  try {
    return normalizeMomentRenderSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_MOMENT_RENDER_SETTINGS;
  }
}

export async function saveMomentRenderSettings(db: DB, settings: MomentRenderSettings): Promise<MomentRenderSettings> {
  const normalized = normalizeMomentRenderSettings(settings);
  await createAppSettingsStorage(db).set(MOMENT_RENDER_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createMomentSpendLedger(db: DB) {
  return {
    async list(): Promise<MomentLedgerRow[]> {
      const rows = await db.select().from(momentSpendLedger);
      return rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        status: String(row.status ?? "pending"),
        estimateUsd: Number(row.estimateUsd ?? MOMENT_ESTIMATED_COST_USD),
        costUsd: row.costUsd === null || row.costUsd === undefined ? null : Number(row.costUsd),
        createdAt: String(row.createdAt ?? ""),
      }));
    },

    async status(settings: MomentRenderSettings, at: Date = new Date()): Promise<MomentSpendStatus> {
      return summarizeMomentSpend(await this.list(), settings, at);
    },

    /** Write a pending claim at the estimate. Durable on commit (see DURABLE_ON_COMMIT_TABLES). */
    async claim(input: { chatId: string; model: string; estimateUsd?: number }): Promise<string> {
      const id = newId();
      await db.insert(momentSpendLedger).values({
        id,
        chatId: input.chatId,
        status: "pending",
        model: input.model,
        estimateUsd: input.estimateUsd ?? MOMENT_ESTIMATED_COST_USD,
        costUsd: null,
        costSource: "estimate",
        createdAt: now(),
        settledAt: null,
      });
      return id;
    },

    /** Settle a claim with the provider-reported cost, or the estimate when none was reported. */
    async settle(id: string, reportedCostUsd: number | undefined, estimateUsd = MOMENT_ESTIMATED_COST_USD) {
      const hasCost = typeof reportedCostUsd === "number" && Number.isFinite(reportedCostUsd) && reportedCostUsd >= 0;
      await db
        .update(momentSpendLedger)
        .set({
          status: "settled",
          costUsd: hasCost ? reportedCostUsd : estimateUsd,
          costSource: hasCost ? "provider" : "estimate",
          settledAt: now(),
        })
        .where(eq(momentSpendLedger.id, id));
      return {
        costUsd: hasCost ? reportedCostUsd : estimateUsd,
        costSource: hasCost ? "provider" : "estimate",
      } as const;
    },

    /**
     * Mark a claim failed. It keeps counting at the estimate: a provider may bill an
     * attempt that errored or timed out on our side, so failures never refund budget.
     */
    async fail(id: string, estimateUsd = MOMENT_ESTIMATED_COST_USD) {
      await db
        .update(momentSpendLedger)
        .set({ status: "failed", costUsd: estimateUsd, costSource: "estimate", settledAt: now() })
        .where(eq(momentSpendLedger.id, id));
    },
  };
}

// ── One render at a time ──
let renderInFlight = false;

/**
 * Run a paid render exclusively. A second render while one is in flight is refused
 * (not queued), so a double click cannot spend twice or race past the cap check.
 */
export async function withExclusiveMomentRender<T>(task: () => Promise<T>): Promise<T> {
  if (renderInFlight) throw new MomentRenderBusyError();
  renderInFlight = true;
  try {
    return await task();
  } finally {
    renderInFlight = false;
  }
}

export function isMomentRenderInFlight(): boolean {
  return renderInFlight;
}
