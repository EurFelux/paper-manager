import * as z from "zod";

// ─── Embedding Model Config ─────────────────────────────────

export const EmbeddingModelConfigSchema = z.object({
  provider: z.enum(["openai"]),
  model: z.string(),
  baseUrl: z.url().optional(),
  apiKey: z.string(),
  dimensions: z.number().int().positive().optional(),
  batchSize: z.number().int().positive().optional(),
});

export type EmbeddingModelConfig = z.infer<typeof EmbeddingModelConfigSchema> & {
  id: string;
};

// ─── Knowledge Base ─────────────────────────────────────────

export const KnowledgeBaseMetadataSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string(),
  embeddingModelId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KnowledgeBaseMetadata = z.infer<typeof KnowledgeBaseMetadataSchema>;

export const UpdateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type UpdateKnowledgeBaseInput = z.infer<typeof UpdateKnowledgeBaseSchema>;

// ─── Literature ─────────────────────────────────────────────

export const LiteratureMetadataSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  titleTranslation: z.string().nullable(),
  author: z.string().nullable(),
  abstract: z.string().nullable(),
  summary: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
  url: z.url().nullable(),
  notes: z.record(z.string(), z.string()).default({}),
  knowledgeBaseId: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LiteratureMetadata = z.infer<typeof LiteratureMetadataSchema>;

export const CreateLiteratureSchema = LiteratureMetadataSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLiteratureInput = z.infer<typeof CreateLiteratureSchema>;

export const UpdateLiteratureSchema = CreateLiteratureSchema.partial();

export type UpdateLiteratureInput = z.infer<typeof UpdateLiteratureSchema>;

// ─── Config ─────────────────────────────────────────────────

export const ConfigSchema = z.object({
  $schema: z.string().optional(),
  embeddingModels: z.record(z.string().min(1), EmbeddingModelConfigSchema).default({}),
  defaultEmbeddingModelId: z.string().min(1).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
