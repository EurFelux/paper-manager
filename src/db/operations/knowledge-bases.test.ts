import type BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDb } from "../test-utils.js";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
} from "./knowledge-bases.js";

let db: BetterSqlite3.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

const input = {
  name: "Test KB",
  description: "A test knowledge base",
  embeddingModelId: "model-1",
};

// ─── createKnowledgeBase ─────────────────────────────────────

describe("createKnowledgeBase", () => {
  it("creates and returns a knowledge base with generated id and timestamps", () => {
    const kb = createKnowledgeBase(db, input);
    expect(kb.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(kb.name).toBe("Test KB");
    expect(kb.description).toBe("A test knowledge base");
    expect(kb.embeddingModelId).toBe("model-1");
    expect(kb.createdAt).toBeInstanceOf(Date);
    expect(kb.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate names due to UNIQUE constraint", () => {
    createKnowledgeBase(db, input);
    expect(() => createKnowledgeBase(db, input)).toThrow();
  });
});

// ─── getKnowledgeBase ────────────────────────────────────────

describe("getKnowledgeBase", () => {
  it("returns the knowledge base by id", () => {
    const created = createKnowledgeBase(db, input);
    const found = getKnowledgeBase(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Test KB");
  });

  it("returns null for non-existent id", () => {
    expect(getKnowledgeBase(db, "non-existent")).toBeNull();
  });
});

// ─── listKnowledgeBases ──────────────────────────────────────

describe("listKnowledgeBases", () => {
  it("returns an empty array when no knowledge bases exist", () => {
    expect(listKnowledgeBases(db)).toEqual([]);
  });

  it("returns knowledge bases ordered by created_at DESC", () => {
    const kb1 = createKnowledgeBase(db, { ...input, name: "First" });
    // Manually backdate kb1 so ordering is deterministic
    db.prepare("UPDATE knowledge_bases SET created_at = created_at - 1000 WHERE id = ?").run(
      kb1.id,
    );
    const kb2 = createKnowledgeBase(db, { ...input, name: "Second" });

    const list = listKnowledgeBases(db);
    expect(list).toHaveLength(2);
    // Second was created after First, so it should come first in DESC order
    expect(list[0]!.id).toBe(kb2.id);
    expect(list[1]!.id).toBe(kb1.id);
  });
});

// ─── deleteKnowledgeBase ─────────────────────────────────────

describe("deleteKnowledgeBase", () => {
  it("deletes an existing knowledge base and returns true", () => {
    const kb = createKnowledgeBase(db, input);
    expect(deleteKnowledgeBase(db, kb.id)).toBe(true);
    expect(getKnowledgeBase(db, kb.id)).toBeNull();
  });

  it("returns false for non-existent id", () => {
    expect(deleteKnowledgeBase(db, "non-existent")).toBe(false);
  });
});
