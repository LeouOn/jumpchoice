import { fileTable, text } from "../file-schema.js";

export const cyoaBuilds = fileTable("cyoa_builds", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  selectedChoiceIds: text("selected_choice_ids").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});