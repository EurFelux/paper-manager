import { FaissStore } from "@langchain/community/vectorstores/faiss";
import type { Document } from "@langchain/core/documents";

import type { EmbeddingModelConfig } from "../types/index.js";
import { AiSdkEmbeddings } from "./embeddings.js";

export async function createVectorStore(
  docs: Document[],
  config: EmbeddingModelConfig,
  directory: string,
): Promise<FaissStore> {
  const embeddings = new AiSdkEmbeddings(config);
  const vectorStore = await FaissStore.fromDocuments(docs, embeddings);
  await vectorStore.save(directory);
  return vectorStore;
}

export async function loadVectorStore(
  config: EmbeddingModelConfig,
  directory: string,
): Promise<FaissStore> {
  const embeddings = new AiSdkEmbeddings(config);
  return FaissStore.load(directory, embeddings);
}

export async function queryVectorStore(
  config: EmbeddingModelConfig,
  directory: string,
  query: string,
  k = 5,
): Promise<Document[]> {
  const store = await loadVectorStore(config, directory);
  return store.similaritySearch(query, k);
}
