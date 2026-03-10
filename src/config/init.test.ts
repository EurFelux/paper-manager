import * as fs from "node:fs";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getFilesDir, getProjectDataDir, getVectorStoreDir } from "./index.js";
import { initScope } from "./init.js";

// initScope() uses getProjectDataDir() which is a module-level constant resolved at import time.
// This means process.chdir() cannot redirect it. We must clean up the actual project data dir
// between tests to ensure isolation.

let origCwd: string;

beforeEach(() => {
  origCwd = process.cwd();
  const projectDir = getProjectDataDir();
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

afterEach(() => {
  process.chdir(origCwd);
  const projectDir = getProjectDataDir();
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

describe("initScope (project scope)", () => {
  it("creates all expected files and directories on first run", () => {
    const result = initScope();
    const baseDir = result.baseDir;

    // All items should be "created"
    expect(result.items.every((item) => item.status === "created")).toBe(true);
    expect(result.items).toHaveLength(5);

    // Verify filesystem
    expect(fs.existsSync(baseDir)).toBe(true);
    expect(fs.existsSync(path.join(baseDir, "config.json"))).toBe(true);
    expect(fs.existsSync(path.join(baseDir, "papers.db"))).toBe(true);
    expect(fs.existsSync(getFilesDir(baseDir))).toBe(true);
    expect(fs.existsSync(getVectorStoreDir(baseDir))).toBe(true);
  });

  it("config.json contains $schema field", () => {
    const result = initScope();
    const configContent = fs.readFileSync(path.join(result.baseDir, "config.json"), "utf-8");
    const config = JSON.parse(configContent) as Record<string, unknown>;
    expect(config["$schema"]).toContain("config.schema.json");
  });

  it("is idempotent — second run reports all items as exists", () => {
    initScope();
    const result = initScope();

    expect(result.items.every((item) => item.status === "exists")).toBe(true);
    expect(result.items).toHaveLength(5);
  });

  it("preserves existing config.json content on second run", () => {
    const result = initScope();
    const configPath = path.join(result.baseDir, "config.json");

    // Write custom content
    fs.writeFileSync(configPath, JSON.stringify({ custom: "data" }));

    // Second init should not overwrite
    initScope();
    const content = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    expect(content["custom"]).toBe("data");
  });
});
