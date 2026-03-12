import * as crypto from "node:crypto";

import type BetterSqlite3 from "better-sqlite3";

import type { KnowledgeBaseMetadata, UpdateKnowledgeBaseInput } from "../../types/index.js";
import { dbRowToKnowledgeBase } from "../index.js";

export function createKnowledgeBase(
  db: BetterSqlite3.Database,
  input: { name: string; description: string; embeddingModelId: string },
): KnowledgeBaseMetadata {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO knowledge_bases (id, name, description, embedding_model_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.name, input.description, input.embeddingModelId, now, now);

  const row = db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").get(id);
  return dbRowToKnowledgeBase(row);
}

export function getKnowledgeBase(
  db: BetterSqlite3.Database,
  id: string,
): KnowledgeBaseMetadata | null {
  const row = db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").get(id);
  if (!row) return null;
  return dbRowToKnowledgeBase(row);
}

export function listKnowledgeBases(db: BetterSqlite3.Database): KnowledgeBaseMetadata[] {
  const rows = db.prepare("SELECT * FROM knowledge_bases ORDER BY created_at DESC").all();
  return rows.map(dbRowToKnowledgeBase);
}

export function updateKnowledgeBase(
  db: BetterSqlite3.Database,
  id: string,
  input: UpdateKnowledgeBaseInput,
): KnowledgeBaseMetadata | null {
  const existing = getKnowledgeBase(db, id);
  if (!existing) return null;

  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE knowledge_bases SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getKnowledgeBase(db, id);
}

export function deleteKnowledgeBase(db: BetterSqlite3.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM knowledge_bases WHERE id = ?").run(id);
  return result.changes > 0;
}
