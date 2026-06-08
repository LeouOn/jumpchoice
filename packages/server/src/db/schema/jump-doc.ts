import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const jumpDocuments = sqliteTable("jump_documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["pending_upload", "pending_extraction", "pending_review", "reviewed", "merged", "analyzed"],
  }).notNull().default("pending_upload"),
  pointBudget: integer("point_budget"),
  metadata: text("metadata").notNull().default("{}"),
  extractions: text("extractions").notNull().default("[]"),
  reviewedExtractions: text("reviewed_extractions").notNull().default("[]"),
  mergedDocument: text("merged_document").notNull().default("{}"),
  analysis: text("analysis").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jumpDocumentFiles = sqliteTable("jump_document_files", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => jumpDocuments.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  originalName: text("original_name").notNull().default(""),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  byteSize: integer("byte_size").notNull().default(0),
  pageCount: integer("page_count"),
  extractionMethod: text("extraction_method", { enum: ["pdf-text", "vision"] }),
  extractionResult: text("extraction_result"),
  createdAt: text("created_at").notNull(),
});

export const jumpDocumentEntries = sqliteTable("jump_document_entries", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => jumpDocuments.id, { onDelete: "cascade" }),
  supplementId: text("supplement_id").notNull(),
  entryType: text("entry_type", {
    enum: ["origin", "perk", "item", "drawback", "companion", "scenario", "altForm"],
  }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cost: integer("cost").notNull().default(0),
  bonusCP: integer("bonus_cp"),
  budget: integer("budget"),
  originId: text("origin_id"),
  tags: text("tags").notNull().default("[]"),
  requires: text("requires").notNull().default("[]"),
  tier: text("tier", { enum: ["S", "A", "B", "C", "D", "F"] }),
  analysisText: text("analysis_text").notNull().default(""),
  synergyIds: text("synergy_ids").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const jumpDocumentBuilds = sqliteTable("jump_document_builds", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => jumpDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  selectedEntryIds: text("selected_entry_ids").notNull().default("[]"),
  totalCost: integer("total_cost").notNull().default(0),
  totalCP: integer("total_cp").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});