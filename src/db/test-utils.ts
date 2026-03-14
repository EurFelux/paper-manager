import { drizzle } from "drizzle-orm/better-sqlite3";

import type { AppDatabase } from "./index.js";
import { initializeDatabase, openDatabase } from "./index.js";

/**
 * Creates an in-memory SQLite database wrapped with Drizzle.
 * Each call returns a fresh, isolated database instance.
 */
export function createTestDb(): AppDatabase {
  const client = openDatabase(":memory:");
  initializeDatabase(client);
  return drizzle(client);
}
