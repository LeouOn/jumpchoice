import { fileTable, text, integer } from "../file-schema.js";

export const cyoaDocuments = fileTable("cyoa_documents", {
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

export const cyoaImages = fileTable("cyoa_images", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  filePath: text("file_path").notNull(),
  originalName: text("original_name").notNull().default(""),
  mimeType: text("mime_type").notNull().default("image/png"),
  byteSize: integer("byte_size").notNull().default(0),
  pageNumber: integer("page_number"),
  extractionMethod: text("extraction_method"),
  extractionResult: text("extraction_result"),
  createdAt: text("created_at").notNull(),
});

export const cyoaChoices = fileTable("cyoa_choices", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  category: text("category").notNull().default("uncategorized"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  stealth: integer("stealth").notNull().default(0),
  pointCost: integer("point_cost").notNull().default(0),
  prerequisites: text("prerequisites").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  tier: text("tier"),
  costEfficiency: integer("cost_efficiency"),
  synergyIds: text("synergy_ids").notNull().default("[]"),
  analysisText: text("analysis_text").notNull().default(""),
  sourceImageIds: text("source_image_ids").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});