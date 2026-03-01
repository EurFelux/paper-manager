import * as crypto from "node:crypto";
import type BetterSqlite3 from "better-sqlite3";
import type { KnowledgeBaseMetadata } from "../../types/index.js";
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

export function deleteKnowledgeBase(db: BetterSqlite3.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM knowledge_bases WHERE id = ?").run(id);
  return result.changes > 0;
}
