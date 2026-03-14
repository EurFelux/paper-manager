import { describe, expect, it } from "vitest";

import {
  ConfigSchema,
  CreateLiteratureSchema,
  EmbeddingModelConfigSchema,
  UpdateLiteratureSchema,
} from "./index.js";

// ─── Helpers ─────────────────────────────────────────────────

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

// ─── EmbeddingModelConfigSchema ──────────────────────────────

describe("EmbeddingModelConfigSchema", () => {
  const minimal = { provider: "openai", model: "text-embedding-3-small", apiKey: "sk-test" };

  it("accepts a minimal valid config", () => {
    expect(EmbeddingModelConfigSchema.parse(minimal)).toMatchObject(minimal);
  });

  it("accepts optional fields", () => {
    const full = {
      ...minimal,
      baseUrl: "https://api.example.com",
      dimensions: 1536,
      batchSize: 100,
    };
    expect(EmbeddingModelConfigSchema.parse(full)).toMatchObject(full);
  });

  it("rejects invalid provider", () => {
    expect(() => EmbeddingModelConfigSchema.parse({ ...minimal, provider: "anthropic" })).toThrow();
  });

  it("rejects non-positive dimensions", () => {
    expect(() => EmbeddingModelConfigSchema.parse({ ...minimal, dimensions: 0 })).toThrow();
    expect(() => EmbeddingModelConfigSchema.parse({ ...minimal, dimensions: -1 })).toThrow();
  });

  it("rejects non-integer dimensions", () => {
    expect(() => EmbeddingModelConfigSchema.parse({ ...minimal, dimensions: 1.5 })).toThrow();
  });

  it("rejects invalid baseUrl", () => {
    expect(() => EmbeddingModelConfigSchema.parse({ ...minimal, baseUrl: "not-a-url" })).toThrow();
  });
});

// ─── CreateLiteratureSchema ──────────────────────────────────

describe("CreateLiteratureSchema", () => {
  const base = {
    title: "Paper",
    titleTranslation: null,
    author: null,
    abstract: null,
    summary: null,
    knowledgeBaseId: validUuid,
    url: null,
    doi: null,
  };

  it("does not require id, createdAt, updatedAt", () => {
    expect(() => CreateLiteratureSchema.parse(base)).not.toThrow();
  });

  it("fills defaults for keywords and notes", () => {
    const result = CreateLiteratureSchema.parse(base);
    expect(result.keywords).toEqual([]);
    expect(result.notes).toEqual({});
  });

  it("rejects empty title", () => {
    expect(() => CreateLiteratureSchema.parse({ ...base, title: "" })).toThrow();
  });

  it("rejects invalid url", () => {
    expect(() => CreateLiteratureSchema.parse({ ...base, url: "not-a-url" })).toThrow();
  });
});

// ─── UpdateLiteratureSchema ──────────────────────────────────

describe("UpdateLiteratureSchema", () => {
  it("accepts a partial update with only title", () => {
    expect(UpdateLiteratureSchema.parse({ title: "Updated" })).toMatchObject({
      title: "Updated",
    });
  });

  it("accepts an empty object", () => {
    expect(() => UpdateLiteratureSchema.parse({})).not.toThrow();
  });
});

// ─── ConfigSchema ────────────────────────────────────────────

describe("ConfigSchema", () => {
  it("accepts an empty object with defaults", () => {
    const result = ConfigSchema.parse({});
    expect(result.embeddingModels).toEqual({});
    expect(result.defaultEmbeddingModelId).toBeUndefined();
  });

  it("accepts a full config", () => {
    const config = {
      embeddingModels: {
        "model-1": {
          provider: "openai" as const,
          model: "text-embedding-3-small",
          apiKey: "sk-test",
        },
      },
      defaultEmbeddingModelId: "model-1",
    };
    expect(ConfigSchema.parse(config)).toMatchObject(config);
  });

  it("rejects empty string as model key", () => {
    expect(() =>
      ConfigSchema.parse({
        embeddingModels: {
          "": { provider: "openai", model: "m", apiKey: "k" },
        },
      }),
    ).toThrow();
  });
});
