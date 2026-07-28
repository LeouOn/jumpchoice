import { fileTable, text, integer } from "../file-schema.js";

export const jumpDocuments = fileTable("jump_documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending_upload"),
  pointBudget: integer("point_budget"),
  metadata: text("metadata").notNull().default("{}"),
  extractions: text("extractions").notNull().default("[]"),
  reviewedExtractions: text("reviewed_extractions").notNull().default("[]"),
  mergedDocument: text("merged_document").notNull().default("{}"),
  analysis: text("analysis").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jumpDocumentFiles = fileTable("jump_document_files", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  filePath: text("file_path").notNull(),
  originalName: text("original_name").notNull().default(""),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  byteSize: integer("byte_size").notNull().default(0),
  pageCount: integer("page_count"),
  extractionMethod: text("extraction_method"),
  extractionResult: text("extraction_result"),
  createdAt: text("created_at").notNull(),
});

export const jumpDocumentEntries = fileTable("jump_document_entries", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  supplementId: text("supplement_id").notNull(),
  entryType: text("entry_type").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cost: integer("cost").notNull().default(0),
  bonusCP: integer("bonus_cp"),
  budget: integer("budget"),
  originId: text("origin_id"),
  tags: text("tags").notNull().default("[]"),
  requires: text("requires").notNull().default("[]"),
  tier: text("tier"),
  analysisText: text("analysis_text").notNull().default(""),
  synergyIds: text("synergy_ids").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const jumpDocumentBuilds = fileTable("jump_document_builds", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  selectedEntryIds: text("selected_entry_ids").notNull().default("[]"),
  totalCost: integer("total_cost").notNull().default(0),
  totalCP: integer("total_cp").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});