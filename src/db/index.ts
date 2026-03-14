import * as fs from "node:fs";
import * as path from "node:path";

import type BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { getProjectDataDir, getUserDataDir } from "../config/index.js";
import { CREATE_KNOWLEDGE_BASES_TABLE, CREATE_LITERATURES_TABLE } from "./schema.js";

// ─── Types ──────────────────────────────────────────────────

export type AppDatabase = BetterSQLite3Database;

// ─── Database Connection ────────────────────────────────────

export function openDatabase(dbPath: string): BetterSqlite3.Database {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initializeDatabase(db: BetterSqlite3.Database): void {
  db.exec(CREATE_KNOWLEDGE_BASES_TABLE);
  db.exec(CREATE_LITERATURES_TABLE);
  migrateDatabase(db);
}

// ─── Migrations ─────────────────────────────────────────────

const MIGRATIONS: ((db: BetterSqlite3.Database) => void)[] = [
  // v0 → v1: add doi column to literatures
  (db) => {
    const columns = db.pragma("table_info(literatures)") as { name: string }[];
    if (!columns.some((c) => c.name === "doi")) {
      db.exec("ALTER TABLE literatures ADD COLUMN doi TEXT");
    }
  },
];

function migrateDatabase(db: BetterSqlite3.Database): void {
  const currentVersion = (db.pragma("user_version", { simple: true }) as number) ?? 0;
  if (currentVersion >= MIGRATIONS.length) return;

  db.transaction(() => {
    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      MIGRATIONS[i]!(db);
    }
    db.pragma(`user_version = ${String(MIGRATIONS.length)}`);
  })();
}

// ─── Singleton Connections ──────────────────────────────────

let userDb: AppDatabase | null = null;
let projectDb: AppDatabase | null = null;

export function getUserDb(): AppDatabase {
  if (!userDb) {
    const dbPath = path.join(getUserDataDir(), "papers.db");
    const client = openDatabase(dbPath);
    initializeDatabase(client);
    userDb = drizzle(client);
  }
  return userDb;
}

export function getProjectDb(): AppDatabase {
  if (!projectDb) {
    const dbPath = path.join(getProjectDataDir(), "papers.db");
    const client = openDatabase(dbPath);
    initializeDatabase(client);
    projectDb = drizzle(client);
  }
  return projectDb;
}
