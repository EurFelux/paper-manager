import { embed as aiEmbed, embedMany as aiEmbedMany } from "ai";

import type { EmbeddingModelConfig } from "../types/index.js";
import { createEmbeddingModel } from "./provider.js";

function buildProviderOptions(
  config: EmbeddingModelConfig,
): Record<string, Record<string, number>> | undefined {
  if (config.dimensions == null) return undefined;
  return { [config.provider]: { dimensions: config.dimensions } };
}

export async function embed(config: EmbeddingModelConfig, text: string): Promise<number[]> {
  const model = createEmbeddingModel(config);
  const result = await aiEmbed({
    model,
    value: text,
    providerOptions: buildProviderOptions(config),
  });
  return result.embedding;
}

export async function embedMany(
  config: EmbeddingModelConfig,
  texts: string[],
): Promise<number[][]> {
  const model = createEmbeddingModel(config);
  const providerOptions = buildProviderOptions(config);

  if (config.batchSize == null || texts.length <= config.batchSize) {
    const result = await aiEmbedMany({ model, values: texts, providerOptions });
    return result.embeddings;
  }

  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += config.batchSize) {
    const batch = texts.slice(i, i + config.batchSize);
    const result = await aiEmbedMany({ model, values: batch, providerOptions });
    embeddings.push(...result.embeddings);
  }
  return embeddings;
}
