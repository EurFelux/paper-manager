import * as crypto from "node:crypto";

import type BetterSqlite3 from "better-sqlite3";

import type {
  CreateLiteratureInput,
  LiteratureMetadata,
  UpdateLiteratureInput,
} from "../../types/index.js";
import { dbRowToLiterature } from "../index.js";

export function createLiterature(
  db: BetterSqlite3.Database,
  input: CreateLiteratureInput,
): LiteratureMetadata {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO literatures (id, title, title_translation, author, abstract, summary, keywords, url, notes, knowledge_base_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.titleTranslation ?? null,
    input.author ?? null,
    input.abstract ?? null,
    input.summary ?? null,
    JSON.stringify(input.keywords),
    input.url ?? null,
    JSON.stringify(input.notes),
    input.knowledgeBaseId,
    now,
    now,
  );

  const row = db.prepare("SELECT * FROM literatures WHERE id = ?").get(id);
  return dbRowToLiterature(row);
}

export function getLiterature(db: BetterSqlite3.Database, id: string): LiteratureMetadata | null {
  const row = db.prepare("SELECT * FROM literatures WHERE id = ?").get(id);
  if (!row) return null;
  return dbRowToLiterature(row);
}

export function listLiteratures(
  db: BetterSqlite3.Database,
  knowledgeBaseId: string,
): LiteratureMetadata[] {
  const rows = db
    .prepare("SELECT * FROM literatures WHERE knowledge_base_id = ? ORDER BY created_at DESC")
    .all(knowledgeBaseId);
  return rows.map(dbRowToLiterature);
}

export function updateLiterature(
  db: BetterSqlite3.Database,
  id: string,
  input: UpdateLiteratureInput,
): LiteratureMetadata | null {
  const existing = getLiterature(db, id);
  if (!existing) return null;

  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.titleTranslation !== undefined) {
    fields.push("title_translation = ?");
    values.push(input.titleTranslation);
  }
  if (input.author !== undefined) {
    fields.push("author = ?");
    values.push(input.author);
  }
  if (input.abstract !== undefined) {
    fields.push("abstract = ?");
    values.push(input.abstract);
  }
  if (input.summary !== undefined) {
    fields.push("summary = ?");
    values.push(input.summary);
  }
  if (input.keywords !== undefined) {
    fields.push("keywords = ?");
    values.push(JSON.stringify(input.keywords));
  }
  if (input.url !== undefined) {
    fields.push("url = ?");
    values.push(input.url);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(JSON.stringify(input.notes));
  }
  if (input.knowledgeBaseId !== undefined) {
    fields.push("knowledge_base_id = ?");
    values.push(input.knowledgeBaseId);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE literatures SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return getLiterature(db, id);
}

export function deleteLiterature(db: BetterSqlite3.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM literatures WHERE id = ?").run(id);
  return result.changes > 0;
}

export function deleteLiteraturesByKnowledgeBaseId(
  db: BetterSqlite3.Database,
  knowledgeBaseId: string,
): number {
  const result = db
    .prepare("DELETE FROM literatures WHERE knowledge_base_id = ?")
    .run(knowledgeBaseId);
  return result.changes;
}

export function getLiteraturesByKnowledgeBaseId(
  db: BetterSqlite3.Database,
  knowledgeBaseId: string,
): LiteratureMetadata[] {
  return listLiteratures(db, knowledgeBaseId);
}
