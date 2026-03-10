import type BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";

import { initializeDatabase } from "./index.js";

/**
 * Creates an in-memory SQLite database with the schema initialized.
 * Each call returns a fresh, isolated database instance.
 */
export function createTestDb(): BetterSqlite3.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initializeDatabase(db);
  return db;
}
