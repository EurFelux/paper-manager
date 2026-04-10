import type {
  CreateLiteratureInput,
  LiteratureMetadata,
  UpdateLiteratureInput,
} from "../../types/index.js";
import { getUserDb } from "../index.js";
import * as ops from "../operations/literatures.js";

export function createLiterature(input: CreateLiteratureInput): LiteratureMetadata {
  return ops.createLiterature(getUserDb(), input);
}

export function getLiterature(id: string): LiteratureMetadata | null {
  return ops.getLiterature(getUserDb(), id);
}

export function listLiteratures(knowledgeBaseId: string): LiteratureMetadata[] {
  return ops.listLiteratures(getUserDb(), knowledgeBaseId);
}

export function updateLiterature(
  id: string,
  input: UpdateLiteratureInput,
): LiteratureMetadata | null {
  return ops.updateLiterature(getUserDb(), id, input);
}

export function deleteLiterature(id: string): boolean {
  return ops.deleteLiterature(getUserDb(), id);
}

export function deleteLiteraturesByKnowledgeBaseId(knowledgeBaseId: string): number {
  return ops.deleteLiteraturesByKnowledgeBaseId(getUserDb(), knowledgeBaseId);
}

export function searchLiteratures(
  knowledgeBaseId: string,
  filters: ops.LiteratureSearchFilters,
): LiteratureMetadata[] {
  return ops.searchLiteratures(getUserDb(), knowledgeBaseId, filters);
}

export function findLiteratureByDoi(
  knowledgeBaseId: string,
  doi: string,
): LiteratureMetadata | null {
  return ops.findLiteratureByDoi(getUserDb(), knowledgeBaseId, doi);
}

export function getLiteraturesByKnowledgeBaseId(knowledgeBaseId: string): LiteratureMetadata[] {
  return ops.getLiteraturesByKnowledgeBaseId(getUserDb(), knowledgeBaseId);
}
