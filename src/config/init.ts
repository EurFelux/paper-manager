import * as fs from "node:fs";
import * as path from "node:path";

import { initializeDatabase, openDatabase } from "../db/index.js";
import {
  getPdfDir,
  getProjectDataDir,
  getUserDataDir,
  getVectorStoreDir,
  writeConfigFile,
} from "./index.js";

export interface InitScopeResult {
  baseDir: string;
  items: Array<{ name: string; status: "created" | "exists" }>;
}

export function initScope(options?: { user?: boolean }): InitScopeResult {
  const baseDir = options?.user ? getUserDataDir() : getProjectDataDir();
  const items: InitScopeResult["items"] = [];

  // 1. Base directory
  if (fs.existsSync(baseDir)) {
    items.push({ name: baseDir, status: "exists" });
  } else {
    fs.mkdirSync(baseDir, { recursive: true });
    items.push({ name: baseDir, status: "created" });
  }

  // 2. config.json — create empty object if missing, preserve if exists
  const configPath = path.join(baseDir, "config.json");
  if (fs.existsSync(configPath)) {
    items.push({ name: "config.json", status: "exists" });
  } else {
    writeConfigFile(configPath, {
      $schema: "https://raw.githubusercontent.com/EurFelux/paper-manager/main/config.schema.json",
    });
    items.push({ name: "config.json", status: "created" });
  }

  // 3. papers.db — open, initialize tables, then close
  //    (avoid polluting the singleton cache; the lazy getter will re-open when needed)
  const dbPath = path.join(baseDir, "papers.db");
  const dbExisted = fs.existsSync(dbPath);
  const db = openDatabase(dbPath);
  initializeDatabase(db);
  db.close();
  items.push({ name: "papers.db", status: dbExisted ? "exists" : "created" });

  // 4. pdfs/ directory
  const pdfDir = getPdfDir(baseDir);
  if (fs.existsSync(pdfDir)) {
    items.push({ name: "pdfs/", status: "exists" });
  } else {
    fs.mkdirSync(pdfDir, { recursive: true });
    items.push({ name: "pdfs/", status: "created" });
  }

  // 5. vector-stores/ directory
  const vectorDir = getVectorStoreDir(baseDir);
  if (fs.existsSync(vectorDir)) {
    items.push({ name: "vector-stores/", status: "exists" });
  } else {
    fs.mkdirSync(vectorDir, { recursive: true });
    items.push({ name: "vector-stores/", status: "created" });
  }

  return { baseDir, items };
}
