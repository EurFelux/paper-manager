import type { EmbeddingModelV3 } from "@ai-sdk/provider";
import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModelConfig } from "../types/index.js";

export function createEmbeddingModel(config: EmbeddingModelConfig): EmbeddingModelV3 {
  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
  return openai.embedding(config.model);
}
