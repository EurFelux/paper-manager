import type {
  CreateLiteratureInput,
  LiteratureMetadata,
  UpdateLiteratureInput,
} from "../../types/index.js";
import { getProjectDb } from "../index.js";
import * as ops from "../operations/literatures.js";

export function createLiterature(input: CreateLiteratureInput): LiteratureMetadata {
  return ops.createLiterature(getProjectDb(), input);
}

export function getLiterature(id: string): LiteratureMetadata | null {
  return ops.getLiterature(getProjectDb(), id);
}

export function listLiteratures(knowledgeBaseId: string): LiteratureMetadata[] {
  return ops.listLiteratures(getProjectDb(), knowledgeBaseId);
}

export function updateLiterature(
  id: string,
  input: UpdateLiteratureInput,
): LiteratureMetadata | null {
  return ops.updateLiterature(getProjectDb(), id, input);
}

export function deleteLiterature(id: string): boolean {
  return ops.deleteLiterature(getProjectDb(), id);
}

export function deleteLiteraturesByKnowledgeBaseId(knowledgeBaseId: string): number {
  return ops.deleteLiteraturesByKnowledgeBaseId(getProjectDb(), knowledgeBaseId);
}

export function getLiteraturesByKnowledgeBaseId(knowledgeBaseId: string): LiteratureMetadata[] {
  return ops.getLiteraturesByKnowledgeBaseId(getProjectDb(), knowledgeBaseId);
}
