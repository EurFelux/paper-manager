import { embed as aiEmbed, embedMany as aiEmbedMany } from "ai";

import type { EmbeddingModelConfig } from "../types/index.js";
import { createEmbeddingModel } from "./provider.js";

export async function embed(config: EmbeddingModelConfig, text: string): Promise<number[]> {
  const model = createEmbeddingModel(config);
  const result = await aiEmbed({ model, value: text });
  return result.embedding;
}

export async function embedMany(
  config: EmbeddingModelConfig,
  texts: string[],
): Promise<number[][]> {
  const model = createEmbeddingModel(config);
  const result = await aiEmbedMany({ model, values: texts });
  return result.embeddings;
}
