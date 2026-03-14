import * as crypto from "node:crypto";

import { desc, eq } from "drizzle-orm";

import type { KnowledgeBaseMetadata, UpdateKnowledgeBaseInput } from "../../types/index.js";
import type { AppDatabase } from "../index.js";
import { knowledgeBases } from "../schema.js";

export function createKnowledgeBase(
  db: AppDatabase,
  input: { name: string; description: string; embeddingModelId: string },
): KnowledgeBaseMetadata {
  const id = crypto.randomUUID();
  const now = new Date();

  const row = db
    .insert(knowledgeBases)
    .values({
      id,
      name: input.name,
      description: input.description,
      embeddingModelId: input.embeddingModelId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (!row) throw new Error("Failed to insert knowledge base");
  return row;
}

export function getKnowledgeBase(db: AppDatabase, id: string): KnowledgeBaseMetadata | null {
  const row = db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id)).get();
  return row ?? null;
}

export function listKnowledgeBases(db: AppDatabase): KnowledgeBaseMetadata[] {
  return db.select().from(knowledgeBases).orderBy(desc(knowledgeBases.createdAt)).all();
}

export function updateKnowledgeBase(
  db: AppDatabase,
  id: string,
  input: UpdateKnowledgeBaseInput,
): KnowledgeBaseMetadata | null {
  const updates: Partial<typeof knowledgeBases.$inferInsert> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  if (Object.keys(updates).length === 0) return getKnowledgeBase(db, id);

  updates.updatedAt = new Date();

  const row = db
    .update(knowledgeBases)
    .set(updates)
    .where(eq(knowledgeBases.id, id))
    .returning()
    .get();
  return row ?? null;
}

export function deleteKnowledgeBase(db: AppDatabase, id: string): boolean {
  const result = db.delete(knowledgeBases).where(eq(knowledgeBases.id, id)).run();
  return result.changes > 0;
}
