import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KnowledgeBaseMetadata } from "../types/index.js";
import { createKnowledgeBaseCommand } from "./knowledge-base.js";

// ─── Mocks ──────────────────────────────────────────────────

const plainOutput: string[] = [];

vi.mock("../logger.js", () => ({
  log: {
    plain: (msg: string) => {
      plainOutput.push(msg);
    },
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
    label: vi.fn(),
    header: vi.fn(),
    newline: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("../db/project/knowledge-bases.js", () => ({
  getKnowledgeBase: vi.fn(),
  listKnowledgeBases: vi.fn(() => []),
  createKnowledgeBase: vi.fn(),
  updateKnowledgeBase: vi.fn(),
  deleteKnowledgeBase: vi.fn(),
}));

vi.mock("../db/user/knowledge-bases.js", () => ({
  getKnowledgeBase: vi.fn(),
  listKnowledgeBases: vi.fn(() => []),
  createKnowledgeBase: vi.fn(),
  updateKnowledgeBase: vi.fn(),
  deleteKnowledgeBase: vi.fn(),
}));

vi.mock("../db/project/literatures.js", () => ({
  getLiteraturesByKnowledgeBaseId: vi.fn(() => []),
  deleteLiteraturesByKnowledgeBaseId: vi.fn(),
}));

vi.mock("../db/user/literatures.js", () => ({
  getLiteraturesByKnowledgeBaseId: vi.fn(() => []),
  deleteLiteraturesByKnowledgeBaseId: vi.fn(),
}));

vi.mock("../config/index.js", () => ({
  getConfig: vi.fn(),
  getProjectDataDir: vi.fn(() => "/tmp/test-project"),
  getUserDataDir: vi.fn(() => "/tmp/test-user"),
  getModelConfig: vi.fn(),
  getFilesDir: vi.fn(() => "/tmp/test-files"),
  getVectorStoreDir: vi.fn(() => "/tmp/test-vectors"),
}));

vi.mock("../vector-store/index.js", () => ({
  queryVectorStore: vi.fn(() => []),
}));

// ─── Helpers ────────────────────────────────────────────────

const now = new Date("2025-01-01T00:00:00.000Z");

function makeKb(overrides?: Partial<KnowledgeBaseMetadata>): KnowledgeBaseMetadata {
  return {
    id: "kb-1",
    name: "Test KB",
    description: "A test knowledge base",
    embeddingModelId: "model-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function runCommand(...args: string[]): Promise<string | undefined> {
  const cmd = createKnowledgeBaseCommand();
  cmd.exitOverride();
  await cmd.parseAsync(["node", "test", ...args]);
  return plainOutput.at(-1);
}

// ─── Tests ──────────────────────────────────────────────────

beforeEach(() => {
  plainOutput.length = 0;
  vi.clearAllMocks();
});

describe("kb list --json", () => {
  it("outputs empty array when no knowledge bases exist", async () => {
    const output = await runCommand("list", "--json");
    expect(output).toBe("[]");
  });

  it("outputs JSON array with scope field", async () => {
    const { listKnowledgeBases } = await import("../db/project/knowledge-bases.js");
    vi.mocked(listKnowledgeBases).mockReturnValue([makeKb()]);

    const output = await runCommand("list", "--json");
    const parsed: unknown = JSON.parse(output!);

    expect(Array.isArray(parsed)).toBe(true);
    const arr = parsed as Array<Record<string, unknown>>;
    expect(arr).toHaveLength(1);
    expect(arr[0]).toMatchObject({
      id: "kb-1",
      name: "Test KB",
      scope: "project",
      embeddingModelId: "model-1",
    });
  });

  it("merges project and user KBs", async () => {
    const projectKb = await import("../db/project/knowledge-bases.js");
    const userKb = await import("../db/user/knowledge-bases.js");
    vi.mocked(projectKb.listKnowledgeBases).mockReturnValue([makeKb({ id: "kb-p" })]);
    vi.mocked(userKb.listKnowledgeBases).mockReturnValue([makeKb({ id: "kb-u", name: "User KB" })]);

    const output = await runCommand("list", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.scope).toBe("project");
    expect(parsed[1]!.scope).toBe("user");
  });

  it("serializes dates as ISO strings", async () => {
    const { listKnowledgeBases } = await import("../db/project/knowledge-bases.js");
    vi.mocked(listKnowledgeBases).mockReturnValue([makeKb()]);

    const output = await runCommand("list", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed[0]!.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(parsed[0]!.updatedAt).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("kb query --json", () => {
  it("outputs empty array when no results found", async () => {
    // Create a temp dir that matches path.join(vectorStoreDir, "kb-1")
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-query-test-"));
    const vectorDir = path.join(tmpDir, "kb-1");
    fs.mkdirSync(vectorDir);

    const projectKb = await import("../db/project/knowledge-bases.js");
    vi.mocked(projectKb.getKnowledgeBase).mockReturnValue(makeKb());

    const { queryVectorStore } = await import("../vector-store/index.js");
    vi.mocked(queryVectorStore).mockResolvedValue([]);

    const { getVectorStoreDir } = await import("../config/index.js");
    vi.mocked(getVectorStoreDir).mockReturnValue(tmpDir);

    const output = await runCommand("query", "kb-1", "test query", "--json");
    expect(output).toBe("[]");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("outputs pageContent and metadata for each result", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-query-test-"));
    const vectorDir = path.join(tmpDir, "kb-1");
    fs.mkdirSync(vectorDir);

    const projectKb = await import("../db/project/knowledge-bases.js");
    vi.mocked(projectKb.getKnowledgeBase).mockReturnValue(makeKb());

    const { queryVectorStore } = await import("../vector-store/index.js");
    vi.mocked(queryVectorStore).mockResolvedValue([
      { pageContent: "chunk text", metadata: { literatureId: "lit-1", loc: { pageNumber: 3 } } },
    ]);

    const { getVectorStoreDir } = await import("../config/index.js");
    vi.mocked(getVectorStoreDir).mockReturnValue(tmpDir);

    const output = await runCommand("query", "kb-1", "test query", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      pageContent: "chunk text",
      metadata: { literatureId: "lit-1", loc: { pageNumber: 3 } },
    });

    fs.rmSync(tmpDir, { recursive: true });
  });
});
