import { readFile, stat } from "node:fs/promises";

import { Document } from "@langchain/core/documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function extractTextContent(filePath: string): Promise<Document[]> {
  const fileStats = await stat(filePath);
  if (fileStats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${String(Math.round(fileStats.size / 1024 / 1024))} MB exceeds the 10 MB limit`,
    );
  }

  const content = await readFile(filePath, "utf-8");
  return [
    new Document({
      pageContent: content,
      metadata: { source: filePath },
    }),
  ];
}
