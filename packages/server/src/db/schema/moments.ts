// ──────────────────────────────────────────────
// Schema: Moment render spend ledger (JumpChoice fork feature)
// ──────────────────────────────────────────────
// One row per paid "Render this moment" attempt. A row is written as a pending
// claim (at the conservative estimate) BEFORE the provider is called and is
// settled afterwards with the provider-reported cost. Rows intentionally do NOT
// reference chats: deleting a chat must never hand back budget that was spent.
import { fileTable, text, real } from "../file-schema.js";

export const momentSpendLedger = fileTable("moment_spend_ledger", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().default(""),
  /** "pending" (claimed, provider call in flight or crashed), "settled", or "failed". */
  status: text("status").notNull().default("pending"),
  model: text("model").notNull().default(""),
  estimateUsd: real("estimate_usd").notNull().default(0),
  /** Actual charge once settled; null while pending. Failed attempts keep the estimate. */
  costUsd: real("cost_usd"),
  /** "provider" when the response reported usage.cost, otherwise "estimate". */
  costSource: text("cost_source").notNull().default("estimate"),
  createdAt: text("created_at").notNull(),
  settledAt: text("settled_at"),
});
