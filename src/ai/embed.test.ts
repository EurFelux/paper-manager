import type { MockInstance } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmbeddingModelConfig } from "../types/index.js";

// Mock the "ai" module before importing embed functions
vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

// Mock the provider to avoid real OpenAI initialization
vi.mock("./provider.js", () => ({
  createEmbeddingModel: vi.fn(() => "mock-model"),
}));

// Import after mocks are set up
const { embed: aiEmbed, embedMany: aiEmbedMany } = await import("ai");
const { embed, embedMany } = await import("./embed.js");

const baseConfig: EmbeddingModelConfig = {
  id: "test",
  provider: "openai",
  model: "text-embedding-3-small",
  apiKey: "sk-test",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── embed ───────────────────────────────────────────────────

describe("embed", () => {
  it("calls ai embed and returns the embedding", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    (aiEmbed as unknown as MockInstance).mockResolvedValue({ embedding: mockEmbedding });

    const result = await embed(baseConfig, "hello");
    expect(result).toEqual(mockEmbedding);
    expect(aiEmbed).toHaveBeenCalledOnce();
  });

  it("passes providerOptions when dimensions is set", async () => {
    (aiEmbed as unknown as MockInstance).mockResolvedValue({ embedding: [0.1] });

    await embed({ ...baseConfig, dimensions: 256 }, "hello");

    expect(aiEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: { openai: { dimensions: 256 } },
      }),
    );
  });

  it("passes undefined providerOptions when dimensions is not set", async () => {
    (aiEmbed as unknown as MockInstance).mockResolvedValue({ embedding: [0.1] });

    await embed(baseConfig, "hello");

    expect(aiEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: undefined,
      }),
    );
  });
});

// ─── embedMany ───────────────────────────────────────────────

describe("embedMany", () => {
  it("calls aiEmbedMany once when no batchSize is set", async () => {
    const mockEmbeddings = [[0.1], [0.2], [0.3]];
    (aiEmbedMany as unknown as MockInstance).mockResolvedValue({ embeddings: mockEmbeddings });

    const result = await embedMany(baseConfig, ["a", "b", "c"]);
    expect(result).toEqual(mockEmbeddings);
    expect(aiEmbedMany).toHaveBeenCalledOnce();
  });

  it("calls aiEmbedMany once when texts fit within batchSize", async () => {
    const config = { ...baseConfig, batchSize: 5 };
    (aiEmbedMany as unknown as MockInstance).mockResolvedValue({ embeddings: [[0.1], [0.2]] });

    const result = await embedMany(config, ["a", "b"]);
    expect(result).toEqual([[0.1], [0.2]]);
    expect(aiEmbedMany).toHaveBeenCalledOnce();
  });

  it("splits into batches when texts exceed batchSize", async () => {
    const config = { ...baseConfig, batchSize: 2 };
    (aiEmbedMany as unknown as MockInstance)
      .mockResolvedValueOnce({ embeddings: [[0.1], [0.2]] })
      .mockResolvedValueOnce({ embeddings: [[0.3], [0.4]] })
      .mockResolvedValueOnce({ embeddings: [[0.5]] });

    const result = await embedMany(config, ["a", "b", "c", "d", "e"]);

    expect(result).toEqual([[0.1], [0.2], [0.3], [0.4], [0.5]]);
    expect(aiEmbedMany).toHaveBeenCalledTimes(3);

    // Verify batch contents
    const calls = (aiEmbedMany as unknown as MockInstance).mock.calls;
    expect(calls[0]![0]).toMatchObject({ values: ["a", "b"] });
    expect(calls[1]![0]).toMatchObject({ values: ["c", "d"] });
    expect(calls[2]![0]).toMatchObject({ values: ["e"] });
  });

  it("handles exact batchSize boundary without extra call", async () => {
    const config = { ...baseConfig, batchSize: 2 };
    (aiEmbedMany as unknown as MockInstance)
      .mockResolvedValueOnce({ embeddings: [[0.1], [0.2]] })
      .mockResolvedValueOnce({ embeddings: [[0.3], [0.4]] });

    const result = await embedMany(config, ["a", "b", "c", "d"]);
    expect(result).toEqual([[0.1], [0.2], [0.3], [0.4]]);
    expect(aiEmbedMany).toHaveBeenCalledTimes(2);
  });

  it("handles empty input", async () => {
    (aiEmbedMany as unknown as MockInstance).mockResolvedValue({ embeddings: [] });

    const result = await embedMany(baseConfig, []);
    expect(result).toEqual([]);
  });
});
