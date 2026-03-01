import { Embeddings } from "@langchain/core/embeddings";
import type { EmbeddingModelConfig } from "../types/index.js";
import { embed, embedMany } from "../ai/embed.js";

export class AiSdkEmbeddings extends Embeddings {
  private readonly config: EmbeddingModelConfig;

  constructor(config: EmbeddingModelConfig) {
    super({});
    this.config = config;
  }

  async embedQuery(document: string): Promise<number[]> {
    return embed(this.config, document);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return embedMany(this.config, documents);
  }
}
