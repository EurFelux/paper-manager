import type BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CreateLiteratureInput } from "../../types/index.js";
import { createTestDb } from "../test-utils.js";
import { createKnowledgeBase } from "./knowledge-bases.js";
import {
  createLiterature,
  deleteLiterature,
  deleteLiteraturesByKnowledgeBaseId,
  getLiterature,
  listLiteratures,
  updateLiterature,
} from "./literatures.js";

let db: BetterSqlite3.Database;
let kbId: string;

beforeEach(() => {
  db = createTestDb();
  // Every literature needs a knowledge base
  const kb = createKnowledgeBase(db, {
    name: "Test KB",
    description: "test",
    embeddingModelId: "model-1",
  });
  kbId = kb.id;
});

afterEach(() => {
  db.close();
});

function makeInput(overrides?: Partial<CreateLiteratureInput>): CreateLiteratureInput {
  return {
    title: "A Paper",
    titleTranslation: null,
    author: "Alice",
    abstract: "This paper explores...",
    summary: null,
    keywords: ["ai", "ml"],
    url: null,
    notes: { read: "yes" },
    knowledgeBaseId: kbId,
    ...overrides,
  };
}

// ─── createLiterature ────────────────────────────────────────

describe("createLiterature", () => {
  it("creates a literature with generated id and timestamps", () => {
    const lit = createLiterature(db, makeInput());
    expect(lit.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(lit.title).toBe("A Paper");
    expect(lit.author).toBe("Alice");
    expect(lit.knowledgeBaseId).toBe(kbId);
  });

  it("round-trips JSON fields (keywords and notes)", () => {
    const lit = createLiterature(
      db,
      makeInput({
        keywords: ["deep learning", "transformer"],
        notes: { chapter1: "interesting", chapter2: "review" },
      }),
    );
    expect(lit.keywords).toEqual(["deep learning", "transformer"]);
    expect(lit.notes).toEqual({ chapter1: "interesting", chapter2: "review" });
  });

  it("handles empty keywords and notes", () => {
    const lit = createLiterature(db, makeInput({ keywords: [], notes: {} }));
    expect(lit.keywords).toEqual([]);
    expect(lit.notes).toEqual({});
  });
});

// ─── getLiterature ───────────────────────────────────────────

describe("getLiterature", () => {
  it("returns the literature by id", () => {
    const created = createLiterature(db, makeInput());
    const found = getLiterature(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe("A Paper");
  });

  it("returns null for non-existent id", () => {
    expect(getLiterature(db, "non-existent")).toBeNull();
  });
});

// ─── listLiteratures ─────────────────────────────────────────

describe("listLiteratures", () => {
  it("returns only literatures belonging to the given KB", () => {
    const kb2 = createKnowledgeBase(db, {
      name: "Other KB",
      description: "other",
      embeddingModelId: "model-1",
    });

    createLiterature(db, makeInput({ title: "Paper A" }));
    createLiterature(db, makeInput({ title: "Paper B", knowledgeBaseId: kb2.id }));

    const list = listLiteratures(db, kbId);
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("Paper A");
  });

  it("returns an empty array for a KB with no literatures", () => {
    expect(listLiteratures(db, kbId)).toEqual([]);
  });
});

// ─── updateLiterature ────────────────────────────────────────

describe("updateLiterature", () => {
  it("updates only the specified fields", () => {
    const lit = createLiterature(db, makeInput());
    const updated = updateLiterature(db, lit.id, { title: "New Title" });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("New Title");
    // Other fields stay unchanged
    expect(updated!.author).toBe("Alice");
    expect(updated!.keywords).toEqual(["ai", "ml"]);
  });

  it("updates JSON fields correctly", () => {
    const lit = createLiterature(db, makeInput());
    const updated = updateLiterature(db, lit.id, {
      keywords: ["new-tag"],
      notes: { updated: "true" },
    });

    expect(updated!.keywords).toEqual(["new-tag"]);
    expect(updated!.notes).toEqual({ updated: "true" });
  });

  it("advances updatedAt on update", () => {
    const lit = createLiterature(db, makeInput());
    const updated = updateLiterature(db, lit.id, { title: "Changed" });

    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(lit.updatedAt.getTime());
  });

  it("returns the original when input is empty (no fields to update)", () => {
    const lit = createLiterature(db, makeInput());
    const unchanged = updateLiterature(db, lit.id, {});

    expect(unchanged).not.toBeNull();
    expect(unchanged!.title).toBe(lit.title);
    expect(unchanged!.updatedAt.getTime()).toBe(lit.updatedAt.getTime());
  });

  it("returns null for non-existent id", () => {
    expect(updateLiterature(db, "non-existent", { title: "X" })).toBeNull();
  });
});

// ─── deleteLiterature ────────────────────────────────────────

describe("deleteLiterature", () => {
  it("deletes an existing literature and returns true", () => {
    const lit = createLiterature(db, makeInput());
    expect(deleteLiterature(db, lit.id)).toBe(true);
    expect(getLiterature(db, lit.id)).toBeNull();
  });

  it("returns false for non-existent id", () => {
    expect(deleteLiterature(db, "non-existent")).toBe(false);
  });
});

// ─── deleteLiteraturesByKnowledgeBaseId ──────────────────────

describe("deleteLiteraturesByKnowledgeBaseId", () => {
  it("deletes all literatures in a KB and returns the count", () => {
    createLiterature(db, makeInput({ title: "Paper 1" }));
    createLiterature(db, makeInput({ title: "Paper 2" }));

    expect(deleteLiteraturesByKnowledgeBaseId(db, kbId)).toBe(2);
    expect(listLiteratures(db, kbId)).toEqual([]);
  });

  it("returns 0 when the KB has no literatures", () => {
    expect(deleteLiteraturesByKnowledgeBaseId(db, kbId)).toBe(0);
  });
});

// ─── Foreign Key Behavior ────────────────────────────────────

describe("foreign key: ON DELETE SET NULL", () => {
  it("sets knowledge_base_id to null when KB is deleted", () => {
    const lit = createLiterature(db, makeInput());
    // Delete the KB directly via SQL to trigger FK cascade
    db.prepare("DELETE FROM knowledge_bases WHERE id = ?").run(kbId);

    // getLiterature() will throw because Zod schema requires knowledgeBaseId to be a UUID,
    // but FK cascade sets it to NULL. Check the raw row instead.
    const raw = db.prepare("SELECT knowledge_base_id FROM literatures WHERE id = ?").get(lit.id) as
      | Record<string, unknown>
      | undefined;
    expect(raw).toBeDefined();
    expect(raw!["knowledge_base_id"]).toBeNull();
  });
});
