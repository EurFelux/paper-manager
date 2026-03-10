import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPdfDir, getVectorStoreDir } from "./index.js";
import { initScope } from "./init.js";

// initScope() reads getUserDataDir/getProjectDataDir which are module-level constants.
// To test it in isolation, we call it with { user: true } and override HOME,
// but since the paths are computed at import time, we instead test with a mock approach:
// We'll directly call the function and verify the result structure + filesystem effects
// by temporarily pointing to a temp directory via the user scope.

// However, since getUserDataDir() returns a fixed path based on os.homedir() at import time,
// we need to test using the project scope with chdir to a temp directory.

let tmpDir: string;
let origCwd: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-test-"));
  origCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
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
    expect(fs.existsSync(getPdfDir(baseDir))).toBe(true);
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
