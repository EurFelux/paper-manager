import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─── Drizzle Table Definitions ──────────────────────────────

export const knowledgeBases = sqliteTable("knowledge_bases", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  embeddingModelId: text("embedding_model_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const literatures = sqliteTable("literatures", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  titleTranslation: text("title_translation"),
  author: text("author"),
  abstract: text("abstract"),
  summary: text("summary"),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(),
  url: text("url"),
  doi: text("doi"),
  notes: text("notes", { mode: "json" }).$type<Record<string, string>>().notNull(),
  knowledgeBaseId: text("knowledge_base_id").references(() => knowledgeBases.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type KnowledgeBaseMetadata = typeof knowledgeBases.$inferSelect;
export type LiteratureMetadata = typeof literatures.$inferSelect;

// ─── Bootstrap SQL ──────────────────────────────────────────

export const CREATE_KNOWLEDGE_BASES_TABLE = `
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    embedding_model_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
)`;

export const CREATE_LITERATURES_TABLE = `
CREATE TABLE IF NOT EXISTS literatures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_translation TEXT,
    author TEXT,
    abstract TEXT,
    summary TEXT,
    keywords TEXT NOT NULL DEFAULT '[]',
    url TEXT,
    doi TEXT,
    notes TEXT NOT NULL DEFAULT '{}',
    knowledge_base_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE SET NULL
)`;
