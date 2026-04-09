import type { Document } from "./types/index.js";

const DEFAULT_SEPARATORS = ["\n\n", "\n", " ", ""];

export function splitDocuments(
  docs: Document[],
  options: { chunkSize: number; chunkOverlap: number },
): Document[] {
  if (options.chunkOverlap >= options.chunkSize) {
    throw new Error("chunkOverlap must be less than chunkSize");
  }
  const result: Document[] = [];
  for (const doc of docs) {
    const chunks = splitText(doc.pageContent, options.chunkSize, options.chunkOverlap);
    for (const chunk of chunks) {
      result.push({ pageContent: chunk, metadata: { ...doc.metadata } });
    }
  }
  return result;
}

function splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  return recursiveSplit(text, DEFAULT_SEPARATORS, chunkSize, chunkOverlap);
}

function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  if (text.length <= chunkSize) return [text];

  const separator = separators[0] ?? "";
  const remaining = separators.slice(1);

  const parts = separator === "" ? [...text] : text.split(separator);

  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const piece = current.length === 0 ? part : current + separator + part;

    if (piece.length > chunkSize && current.length > 0) {
      chunks.push(current);

      // Overlap: keep the tail of the current chunk
      if (chunkOverlap > 0 && current.length > chunkOverlap) {
        current = current.slice(-chunkOverlap) + separator + part;
      } else {
        current = part;
      }
    } else {
      current = piece;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  // Recursively split any chunks that are still too large
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > chunkSize && remaining.length > 0) {
      finalChunks.push(...recursiveSplit(chunk, remaining, chunkSize, chunkOverlap));
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}
