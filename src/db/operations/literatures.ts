import * as crypto from "node:crypto";

import { desc, eq } from "drizzle-orm";

import type {
  CreateLiteratureInput,
  LiteratureMetadata,
  UpdateLiteratureInput,
} from "../../types/index.js";
import type { AppDatabase } from "../index.js";
import { literatures } from "../schema.js";

export function createLiterature(
  db: AppDatabase,
  input: CreateLiteratureInput,
): LiteratureMetadata {
  const id = crypto.randomUUID();
  const now = new Date();

  const row = db
    .insert(literatures)
    .values({
      id,
      title: input.title,
      titleTranslation: input.titleTranslation,
      author: input.author,
      abstract: input.abstract,
      summary: input.summary,
      keywords: input.keywords,
      url: input.url,
      doi: input.doi,
      notes: input.notes,
      knowledgeBaseId: input.knowledgeBaseId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (!row) throw new Error("Failed to insert literature");
  return row;
}

export function getLiterature(db: AppDatabase, id: string): LiteratureMetadata | null {
  const row = db.select().from(literatures).where(eq(literatures.id, id)).get();
  return row ?? null;
}

export function listLiteratures(db: AppDatabase, knowledgeBaseId: string): LiteratureMetadata[] {
  return db
    .select()
    .from(literatures)
    .where(eq(literatures.knowledgeBaseId, knowledgeBaseId))
    .orderBy(desc(literatures.createdAt))
    .all();
}

export function updateLiterature(
  db: AppDatabase,
  id: string,
  input: UpdateLiteratureInput,
): LiteratureMetadata | null {
  const updates: Partial<typeof literatures.$inferInsert> = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.titleTranslation !== undefined) updates.titleTranslation = input.titleTranslation;
  if (input.author !== undefined) updates.author = input.author;
  if (input.abstract !== undefined) updates.abstract = input.abstract;
  if (input.summary !== undefined) updates.summary = input.summary;
  if (input.keywords !== undefined) updates.keywords = input.keywords;
  if (input.url !== undefined) updates.url = input.url;
  if (input.doi !== undefined) updates.doi = input.doi;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.knowledgeBaseId !== undefined) updates.knowledgeBaseId = input.knowledgeBaseId;

  if (Object.keys(updates).length === 0) return getLiterature(db, id);

  updates.updatedAt = new Date();

  const row = db.update(literatures).set(updates).where(eq(literatures.id, id)).returning().get();
  return row ?? null;
}

export function deleteLiterature(db: AppDatabase, id: string): boolean {
  const result = db.delete(literatures).where(eq(literatures.id, id)).run();
  return result.changes > 0;
}

export function deleteLiteraturesByKnowledgeBaseId(
  db: AppDatabase,
  knowledgeBaseId: string,
): number {
  const result = db
    .delete(literatures)
    .where(eq(literatures.knowledgeBaseId, knowledgeBaseId))
    .run();
  return result.changes;
}

export function getLiteraturesByKnowledgeBaseId(
  db: AppDatabase,
  knowledgeBaseId: string,
): LiteratureMetadata[] {
  return listLiteratures(db, knowledgeBaseId);
}
