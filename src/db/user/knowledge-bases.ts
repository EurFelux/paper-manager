import type { KnowledgeBaseMetadata } from "../../types/index.js";
import { getUserDb } from "../index.js";
import * as ops from "../operations/knowledge-bases.js";

export function createKnowledgeBase(input: {
  name: string;
  description: string;
  embeddingModelId: string;
}): KnowledgeBaseMetadata {
  return ops.createKnowledgeBase(getUserDb(), input);
}

export function getKnowledgeBase(id: string): KnowledgeBaseMetadata | null {
  return ops.getKnowledgeBase(getUserDb(), id);
}

export function listKnowledgeBases(): KnowledgeBaseMetadata[] {
  return ops.listKnowledgeBases(getUserDb());
}

export function deleteKnowledgeBase(id: string): boolean {
  return ops.deleteKnowledgeBase(getUserDb(), id);
}
