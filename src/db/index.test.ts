import { describe, expect, it } from "vitest";

import { initializeDatabase, openDatabase } from "./index.js";

// ─── openDatabase ────────────────────────────────────────────

describe("openDatabase", () => {
  it("opens an in-memory database with foreign keys enabled", () => {
    const db = openDatabase(":memory:");
    // WAL mode silently falls back to "memory" for in-memory databases
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    db.close();
  });
});

// ─── initializeDatabase ──────────────────────────────────────

describe("initializeDatabase", () => {
  it("creates knowledge_bases and literatures tables", () => {
    const db = openDatabase(":memory:");
    initializeDatabase(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("knowledge_bases");
    expect(tableNames).toContain("literatures");

    db.close();
  });

  it("is idempotent — can be called multiple times", () => {
    const db = openDatabase(":memory:");
    initializeDatabase(db);
    expect(() => initializeDatabase(db)).not.toThrow();
    db.close();
  });
});
