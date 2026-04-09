import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { embed, embedMany } from "../ai/embed.js";
import type { Document, EmbeddingModelConfig } from "../types/index.js";

type DocEntries = Array<[string, Document]>;
type IdMapping = Record<number, string>;

async function importFaiss() {
  const { IndexFlatL2 } = (await import("faiss-node")).default;
  return { IndexFlatL2 };
}

function parseDocstore(raw: string): [DocEntries, IdMapping] {
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    !Array.isArray(parsed[0]) ||
    typeof parsed[1] !== "object" ||
    parsed[1] === null
  ) {
    throw new Error("Corrupt docstore.json: expected [entries, mapping] tuple");
  }
  // Safe after validation: parsed[0] is Array, parsed[1] is non-null object
  const entries: DocEntries = parsed[0];
  const mapping: IdMapping = parsed[1];
  return [entries, mapping];
}

export async function createVectorStore(
  docs: Document[],
  config: EmbeddingModelConfig,
  directory: string,
): Promise<void> {
  if (docs.length === 0) return;

  const texts = docs.map((d) => d.pageContent);
  const vectors = await embedMany(config, texts);
  const dimension = vectors[0]!.length;

  const { IndexFlatL2 } = await importFaiss();
  const index = new IndexFlatL2(dimension);

  const mapping: IdMapping = {};
  const docEntries: DocEntries = [];

  for (let i = 0; i < vectors.length; i++) {
    const id = randomUUID();
    index.add(vectors[i]!);
    mapping[i] = id;
    docEntries.push([id, docs[i]!]);
  }

  await fs.mkdir(directory, { recursive: true });
  index.write(path.join(directory, "faiss.index"));
  await fs.writeFile(path.join(directory, "docstore.json"), JSON.stringify([docEntries, mapping]));
}

export async function addDocuments(
  docs: Document[],
  config: EmbeddingModelConfig,
  directory: string,
): Promise<void> {
  if (docs.length === 0) return;

  const texts = docs.map((d) => d.pageContent);
  const vectors = await embedMany(config, texts);

  const { IndexFlatL2 } = await importFaiss();
  const index = IndexFlatL2.read(path.join(directory, "faiss.index"));
  const raw = await fs.readFile(path.join(directory, "docstore.json"), "utf-8");
  const [existingDocs, mapping] = parseDocstore(raw);

  const baseId = index.ntotal();
  for (let i = 0; i < vectors.length; i++) {
    const id = randomUUID();
    index.add(vectors[i]!);
    mapping[baseId + i] = id;
    existingDocs.push([id, docs[i]!]);
  }

  index.write(path.join(directory, "faiss.index"));
  await fs.writeFile(
    path.join(directory, "docstore.json"),
    JSON.stringify([existingDocs, mapping]),
  );
}

export async function queryVectorStore(
  config: EmbeddingModelConfig,
  directory: string,
  query: string,
  k = 5,
): Promise<Document[]> {
  const { IndexFlatL2 } = await importFaiss();
  const index = IndexFlatL2.read(path.join(directory, "faiss.index"));
  const raw = await fs.readFile(path.join(directory, "docstore.json"), "utf-8");
  const [docEntries, mapping] = parseDocstore(raw);

  const docMap = new Map(docEntries);
  const queryVector = await embed(config, query);

  const total = index.ntotal();
  if (total === 0) return [];
  const effectiveK = Math.min(k, total);

  const result = index.search(queryVector, effectiveK);
  return result.labels
    .filter((label) => label >= 0)
    .map((label) => {
      const docId = mapping[label];
      return docId ? docMap.get(docId) : undefined;
    })
    .filter((doc): doc is Document => doc != null);
}
