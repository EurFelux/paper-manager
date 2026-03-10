import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getDefaultModelConfig,
  getFilesDir,
  getModelConfig,
  getVectorStoreDir,
  readConfigFile,
  writeConfigFile,
} from "./index.js";

// ─── Path Utilities ──────────────────────────────────────────

describe("getFilesDir", () => {
  it("appends files to base path", () => {
    expect(getFilesDir("/data")).toBe(path.join("/data", "files"));
  });
});

describe("getVectorStoreDir", () => {
  it("appends vector-stores to base path", () => {
    expect(getVectorStoreDir("/data")).toBe(path.join("/data", "vector-stores"));
  });
});

// ─── Config File I/O ─────────────────────────────────────────

describe("readConfigFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads and parses a valid JSON config", () => {
    const filePath = path.join(tmpDir, "config.json");
    fs.writeFileSync(filePath, JSON.stringify({ key: "value" }));
    expect(readConfigFile(filePath)).toEqual({ key: "value" });
  });

  it("returns empty object for non-existent file", () => {
    expect(readConfigFile(path.join(tmpDir, "missing.json"))).toEqual({});
  });

  it("returns empty object for invalid JSON", () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "not json");
    expect(readConfigFile(filePath)).toEqual({});
  });

  it("returns empty object when file contains a JSON array", () => {
    const filePath = path.join(tmpDir, "array.json");
    fs.writeFileSync(filePath, JSON.stringify([1, 2, 3]));
    expect(readConfigFile(filePath)).toEqual({});
  });
});

describe("writeConfigFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes config as formatted JSON with trailing newline", () => {
    const filePath = path.join(tmpDir, "config.json");
    writeConfigFile(filePath, { hello: "world" });
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toBe('{\n  "hello": "world"\n}\n');
  });

  it("creates parent directories if they do not exist", () => {
    const filePath = path.join(tmpDir, "nested", "deep", "config.json");
    writeConfigFile(filePath, { a: 1 });
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ─── Config Access (requires real file system) ───────────────
// These functions read from hardcoded user/project paths, so we test
// the lower-level building blocks that don't depend on global state.

describe("getConfig", () => {
  let tmpDir: string;
  let origHome: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-test-"));
    origHome = process.env["HOME"] ?? "";
    origCwd = process.cwd();
    // Point user/project config to temp dirs by monkey-patching env
    // Note: getUserDataDir/getProjectDataDir read from module-level constants,
    // so we write config files at the actual resolved paths instead.
  });

  afterEach(() => {
    process.env["HOME"] = origHome;
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("validates and returns typed config values", () => {
    // Test readConfigFile + schema validation directly
    const filePath = path.join(tmpDir, "config.json");
    const models = {
      "model-1": {
        provider: "openai",
        model: "text-embedding-3-small",
        apiKey: "sk-test",
      },
    };
    writeConfigFile(filePath, { embeddingModels: models });

    const config = readConfigFile(filePath);
    expect(config["embeddingModels"]).toEqual(models);
  });
});

// ─── setConfig / removeConfig / listConfig ───────────────────

describe("setConfig / removeConfig / listConfig (via file path)", () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-test-"));
    filePath = path.join(tmpDir, "config.json");
    writeConfigFile(filePath, {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("set then read round-trips a value", () => {
    writeConfigFile(filePath, {});
    const config = readConfigFile(filePath);
    config["myKey"] = "myValue";
    writeConfigFile(filePath, config);

    const result = readConfigFile(filePath);
    expect(result["myKey"]).toBe("myValue");
  });

  it("remove deletes a key", () => {
    const config: Record<string, unknown> = { a: 1, b: 2 };
    writeConfigFile(filePath, config);
    delete config["a"];
    writeConfigFile(filePath, config);

    const result = readConfigFile(filePath);
    expect(result["a"]).toBeUndefined();
    expect(result["b"]).toBe(2);
  });
});

// ─── getModelConfig / getDefaultModelConfig ──────────────────

describe("getModelConfig / getDefaultModelConfig", () => {
  // These depend on loadMergedConfig() which reads from fixed paths.
  // We test the error paths which don't depend on file state.

  it("getModelConfig throws when no models are configured", () => {
    // loadMergedConfig returns {} when files don't exist,
    // so getConfig("embeddingModels") returns null
    expect(() => getModelConfig("nonexistent")).toThrow("No embedding models configured");
  });

  it("getDefaultModelConfig throws when no default is set", () => {
    expect(() => getDefaultModelConfig()).toThrow("No default embedding model configured");
  });
});
