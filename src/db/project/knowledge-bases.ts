import type { KnowledgeBaseMetadata, UpdateKnowledgeBaseInput } from "../../types/index.js";
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

export function updateKnowledgeBase(
  id: string,
  input: UpdateKnowledgeBaseInput,
): KnowledgeBaseMetadata | null {
  return ops.updateKnowledgeBase(getProjectDb(), id, input);
}

export function deleteKnowledgeBase(id: string): boolean {
  return ops.deleteKnowledgeBase(getProjectDb(), id);
}
