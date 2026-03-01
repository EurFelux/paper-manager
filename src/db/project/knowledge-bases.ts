import type { KnowledgeBaseMetadata } from "../../types/index.js";
import { getProjectDb } from "../index.js";
import * as ops from "../operations/knowledge-bases.js";

export function createKnowledgeBase(input: {
  name: string;
  description: string;
  embeddingModelId: string;
}): KnowledgeBaseMetadata {
  return ops.createKnowledgeBase(getProjectDb(), input);
}

export function getKnowledgeBase(id: string): KnowledgeBaseMetadata | null {
  return ops.getKnowledgeBase(getProjectDb(), id);
}

export function listKnowledgeBases(): KnowledgeBaseMetadata[] {
  return ops.listKnowledgeBases(getProjectDb());
}

export function deleteKnowledgeBase(id: string): boolean {
  return ops.deleteKnowledgeBase(getProjectDb(), id);
}
