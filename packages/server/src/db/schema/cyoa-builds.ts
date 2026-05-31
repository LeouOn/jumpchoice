import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { cyoaDocuments } from "./cyoa.js";

export const cyoaBuilds = sqliteTable("cyoa_builds", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => cyoaDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  description: text("description").notNull().default(""),
  selectedChoiceIds: text("selected_choice_ids").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
