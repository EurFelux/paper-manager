import { describe, expect, it } from "vitest";

import {
  ConfigSchema,
  CreateLiteratureSchema,
  EmbeddingModelConfigSchema,
  KnowledgeBaseMetadataSchema,
  LiteratureMetadataSchema,
  UpdateLiteratureSchema,
} from "./index.js";

// ─── Helpers ─────────────────────────────────────────────────

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const now = new Date();

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

// ─── KnowledgeBaseMetadataSchema ─────────────────────────────

describe("KnowledgeBaseMetadataSchema", () => {
  const valid = {
    id: validUuid,
    name: "My KB",
    description: "A test knowledge base",
    embeddingModelId: "model-1",
    createdAt: now,
    updatedAt: now,
  };

  it("accepts a valid knowledge base", () => {
    expect(KnowledgeBaseMetadataSchema.parse(valid)).toMatchObject(valid);
  });

  it("rejects non-uuid id", () => {
    expect(() => KnowledgeBaseMetadataSchema.parse({ ...valid, id: "not-a-uuid" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => KnowledgeBaseMetadataSchema.parse({ ...valid, name: "" })).toThrow();
  });

  it("rejects empty embeddingModelId", () => {
    expect(() => KnowledgeBaseMetadataSchema.parse({ ...valid, embeddingModelId: "" })).toThrow();
  });
});

// ─── LiteratureMetadataSchema ────────────────────────────────

describe("LiteratureMetadataSchema", () => {
  const valid = {
    id: validUuid,
    title: "A Paper",
    titleTranslation: null,
    author: null,
    abstract: null,
    summary: null,
    keywords: [],
    url: null,
    notes: {},
    knowledgeBaseId: validUuid,
    createdAt: now,
    updatedAt: now,
  };

  it("accepts a minimal valid literature", () => {
    expect(LiteratureMetadataSchema.parse(valid)).toMatchObject(valid);
  });

  it("fills defaults for keywords and notes", () => {
    const { keywords: _, notes: __, ...without } = valid;
    const result = LiteratureMetadataSchema.parse(without);
    expect(result.keywords).toEqual([]);
    expect(result.notes).toEqual({});
  });

  it("accepts populated optional fields", () => {
    const full = {
      ...valid,
      titleTranslation: "一篇论文",
      author: "Alice",
      abstract: "This paper...",
      summary: "Summary here",
      keywords: ["ai", "ml"],
      url: "https://arxiv.org/abs/1234.5678",
      notes: { key: "value" },
    };
    expect(LiteratureMetadataSchema.parse(full)).toMatchObject(full);
  });

  it("rejects empty title", () => {
    expect(() => LiteratureMetadataSchema.parse({ ...valid, title: "" })).toThrow();
  });

  it("rejects invalid url", () => {
    expect(() => LiteratureMetadataSchema.parse({ ...valid, url: "not-a-url" })).toThrow();
  });
});

// ─── CreateLiteratureSchema ──────────────────────────────────

describe("CreateLiteratureSchema", () => {
  it("does not require id, createdAt, updatedAt", () => {
    const input = {
      title: "New Paper",
      titleTranslation: null,
      author: null,
      abstract: null,
      summary: null,
      knowledgeBaseId: validUuid,
      url: null,
    };
    expect(() => CreateLiteratureSchema.parse(input)).not.toThrow();
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
