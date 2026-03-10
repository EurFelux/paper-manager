import { describe, expect, it } from "vitest";

import { dbRowToKnowledgeBase, dbRowToLiterature, isRecord } from "./index.js";

// ─── isRecord ────────────────────────────────────────────────

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });

  it("returns false for primitives and null", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord("string")).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});

// ─── dbRowToKnowledgeBase ────────────────────────────────────

describe("dbRowToKnowledgeBase", () => {
  const validRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Test KB",
    description: "A description",
    embedding_model_id: "model-1",
    created_at: 1700000000000,
    updated_at: 1700000000000,
  };

  it("converts a valid DB row to KnowledgeBaseMetadata", () => {
    const result = dbRowToKnowledgeBase(validRow);
    expect(result.id).toBe(validRow.id);
    expect(result.name).toBe("Test KB");
    expect(result.embeddingModelId).toBe("model-1");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1700000000000);
  });

  it("throws on non-object input", () => {
    expect(() => dbRowToKnowledgeBase(null)).toThrow("Invalid database row");
    expect(() => dbRowToKnowledgeBase("string")).toThrow("Invalid database row");
    expect(() => dbRowToKnowledgeBase([])).toThrow("Invalid database row");
  });
});

// ─── dbRowToLiterature ───────────────────────────────────────

describe("dbRowToLiterature", () => {
  const validRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "A Paper",
    title_translation: null,
    author: "Alice",
    abstract: "This paper...",
    summary: null,
    keywords: '["ai","ml"]',
    url: null,
    notes: '{"read":"yes"}',
    knowledge_base_id: "550e8400-e29b-41d4-a716-446655440000",
    created_at: 1700000000000,
    updated_at: 1700000000000,
  };

  it("converts a valid DB row with JSON fields", () => {
    const result = dbRowToLiterature(validRow);
    expect(result.title).toBe("A Paper");
    expect(result.author).toBe("Alice");
    expect(result.keywords).toEqual(["ai", "ml"]);
    expect(result.notes).toEqual({ read: "yes" });
    expect(result.knowledgeBaseId).toBe(validRow.knowledge_base_id);
  });

  it("handles missing keywords/notes with defaults", () => {
    const row = { ...validRow, keywords: undefined, notes: undefined };
    const result = dbRowToLiterature(row);
    expect(result.keywords).toEqual([]);
    expect(result.notes).toEqual({});
  });

  it("throws on non-object input", () => {
    expect(() => dbRowToLiterature(42)).toThrow("Invalid database row");
  });
});
