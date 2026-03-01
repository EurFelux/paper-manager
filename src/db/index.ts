import * as fs from "node:fs";
import * as path from "node:path";

import type BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";

import { getProjectDataDir, getUserDataDir } from "../config/index.js";
import type { KnowledgeBaseMetadata, LiteratureMetadata } from "../types/index.js";
import { KnowledgeBaseMetadataSchema, LiteratureMetadataSchema } from "../types/index.js";
import { CREATE_KNOWLEDGE_BASES_TABLE, CREATE_LITERATURES_TABLE } from "./schema.js";

// ─── Type Guard ─────────────────────────────────────────────

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── Row Converters ─────────────────────────────────────────

export function dbRowToKnowledgeBase(row: unknown): KnowledgeBaseMetadata {
  if (!isRecord(row)) {
    throw new Error("Invalid database row: expected an object");
  }
  return KnowledgeBaseMetadataSchema.parse({
    id: row["id"],
    name: row["name"],
    description: row["description"],
    embeddingModelId: row["embedding_model_id"],
    createdAt: new Date(Number(row["created_at"])),
    updatedAt: new Date(Number(row["updated_at"])),
  });
}

export function dbRowToLiterature(row: unknown): LiteratureMetadata {
  if (!isRecord(row)) {
    throw new Error("Invalid database row: expected an object");
  }
  return LiteratureMetadataSchema.parse({
    id: row["id"],
    title: row["title"],
    titleTranslation: row["title_translation"] ?? null,
    author: row["author"] ?? null,
    abstract: row["abstract"] ?? null,
    summary: row["summary"] ?? null,
    keywords: JSON.parse(typeof row["keywords"] === "string" ? row["keywords"] : "[]"),
    url: row["url"] ?? null,
    notes: JSON.parse(typeof row["notes"] === "string" ? row["notes"] : "{}"),
    knowledgeBaseId: row["knowledge_base_id"],
    createdAt: new Date(Number(row["created_at"])),
    updatedAt: new Date(Number(row["updated_at"])),
  });
}

// ─── Database Connection ────────────────────────────────────

export function openDatabase(dbPath: string): BetterSqlite3.Database {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initializeDatabase(db: BetterSqlite3.Database): void {
  db.exec(CREATE_KNOWLEDGE_BASES_TABLE);
  db.exec(CREATE_LITERATURES_TABLE);
}

// ─── Singleton Connections ──────────────────────────────────

let userDb: BetterSqlite3.Database | null = null;
let projectDb: BetterSqlite3.Database | null = null;

export function getUserDb(): BetterSqlite3.Database {
  if (!userDb) {
    const dbPath = path.join(getUserDataDir(), "papers.db");
    userDb = openDatabase(dbPath);
    initializeDatabase(userDb);
  }
  return userDb;
}

export function getProjectDb(): BetterSqlite3.Database {
  if (!projectDb) {
    const dbPath = path.join(getProjectDataDir(), "papers.db");
    projectDb = openDatabase(dbPath);
    initializeDatabase(projectDb);
  }
  return projectDb;
}
