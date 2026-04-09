import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LiteratureMetadata } from "../types/index.js";
import { createLiteratureCommand } from "./literature.js";

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
}));

vi.mock("../db/user/knowledge-bases.js", () => ({
  getKnowledgeBase: vi.fn(),
}));

vi.mock("../db/project/literatures.js", () => ({
  getLiterature: vi.fn(),
  listLiteratures: vi.fn(() => []),
  searchLiteratures: vi.fn(() => []),
  createLiterature: vi.fn(),
  updateLiterature: vi.fn(),
  deleteLiterature: vi.fn(),
  deleteLiteraturesByKnowledgeBaseId: vi.fn(),
  getLiteraturesByKnowledgeBaseId: vi.fn(() => []),
}));

vi.mock("../db/user/literatures.js", () => ({
  getLiterature: vi.fn(),
  listLiteratures: vi.fn(() => []),
  searchLiteratures: vi.fn(() => []),
  createLiterature: vi.fn(),
  updateLiterature: vi.fn(),
  deleteLiterature: vi.fn(),
  deleteLiteraturesByKnowledgeBaseId: vi.fn(),
  getLiteraturesByKnowledgeBaseId: vi.fn(() => []),
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
  createVectorStore: vi.fn(),
  loadVectorStore: vi.fn(),
}));

vi.mock("../extractor/index.js", () => ({
  extractContent: vi.fn(),
  extractPdfMetadata: vi.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────

const now = new Date("2025-01-01T00:00:00.000Z");

function makeLit(overrides?: Partial<LiteratureMetadata>): LiteratureMetadata {
  return {
    id: "lit-1",
    title: "Attention Is All You Need",
    titleTranslation: null,
    author: "Vaswani et al.",
    abstract: "The dominant sequence transduction models...",
    summary: null,
    keywords: ["transformer", "attention"],
    url: null,
    doi: "10.5555/3295222.3295349",
    notes: { status: "read" },
    knowledgeBaseId: "kb-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function stubKbResolve(): Promise<void> {
  const projectKb = await import("../db/project/knowledge-bases.js");
  vi.mocked(projectKb.getKnowledgeBase).mockReturnValue({
    id: "kb-1",
    name: "Test KB",
    description: "test",
    embeddingModelId: "model-1",
    createdAt: now,
    updatedAt: now,
  });
}

async function runCommand(...args: string[]): Promise<string | undefined> {
  const cmd = createLiteratureCommand();
  cmd.exitOverride();
  await cmd.parseAsync(["node", "test", ...args]);
  return plainOutput.at(-1);
}

// ─── Tests ──────────────────────────────────────────────────

beforeEach(() => {
  plainOutput.length = 0;
  vi.clearAllMocks();
});

describe("lit list --json", () => {
  it("outputs empty array when no literatures exist", async () => {
    await stubKbResolve();

    const output = await runCommand("list", "kb-1", "--json");
    expect(output).toBe("[]");
  });

  it("outputs full literature objects as JSON array", async () => {
    await stubKbResolve();
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.listLiteratures).mockReturnValue([makeLit()]);

    const output = await runCommand("list", "kb-1", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: "lit-1",
      title: "Attention Is All You Need",
      author: "Vaswani et al.",
      keywords: ["transformer", "attention"],
      doi: "10.5555/3295222.3295349",
    });
  });

  it("serializes dates as ISO strings", async () => {
    await stubKbResolve();
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.listLiteratures).mockReturnValue([makeLit()]);

    const output = await runCommand("list", "kb-1", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed[0]!.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("lit search --json", () => {
  it("outputs empty array when no results", async () => {
    await stubKbResolve();

    const output = await runCommand("search", "kb-1", "--title", "nonexistent", "--json");
    expect(output).toBe("[]");
  });

  it("outputs matching literatures as JSON", async () => {
    await stubKbResolve();
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.searchLiteratures).mockReturnValue([makeLit()]);

    const output = await runCommand("search", "kb-1", "--title", "Attention", "--json");
    const parsed = JSON.parse(output!) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.title).toBe("Attention Is All You Need");
  });
});

describe("lit show --json", () => {
  it("outputs single literature object", async () => {
    await stubKbResolve();
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.getLiterature).mockReturnValue(makeLit());

    const output = await runCommand("show", "kb-1", "lit-1", "--json");
    const parsed = JSON.parse(output!) as Record<string, unknown>;

    expect(parsed.id).toBe("lit-1");
    expect(parsed.title).toBe("Attention Is All You Need");
    expect(parsed.notes).toEqual({ status: "read" });
  });
});

describe("lit note list --json", () => {
  it("outputs notes object as JSON", async () => {
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.getLiterature).mockReturnValue(
      makeLit({ notes: { chapter1: "interesting", status: "read" } }),
    );

    const output = await runCommand("note", "list", "lit-1", "--json");
    const parsed = JSON.parse(output!) as Record<string, unknown>;

    expect(parsed).toEqual({ chapter1: "interesting", status: "read" });
  });

  it("outputs empty object when no notes", async () => {
    const projectLit = await import("../db/project/literatures.js");
    vi.mocked(projectLit.getLiterature).mockReturnValue(makeLit({ notes: {} }));

    const output = await runCommand("note", "list", "lit-1", "--json");
    const parsed = JSON.parse(output!) as Record<string, unknown>;

    expect(parsed).toEqual({});
  });
});
