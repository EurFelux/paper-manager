import type { Document } from "@langchain/core/documents";
import mime from "mime-types";

import { extractPdfContent, extractPdfMetadata } from "./pdf.js";
import { extractTextContent } from "./text.js";

export { extractPdfContent, extractPdfMetadata, extractTextContent };
export type { PdfMetadata } from "./pdf.js";

const TEXT_LIKE_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/x-tex",
  "application/x-latex",
]);

function isTextLike(mimeType: string): boolean {
  return mimeType.startsWith("text/") || TEXT_LIKE_MIME_TYPES.has(mimeType);
}

export async function extractContent(filePath: string): Promise<Document[]> {
  const mimeType = mime.lookup(filePath);

  if (mimeType === "application/pdf") {
    return extractPdfContent(filePath);
  }

  if (typeof mimeType === "string" && isTextLike(mimeType)) {
    return extractTextContent(filePath);
  }

  const ext = filePath.split(".").pop() ?? "unknown";
  throw new Error(`Unsupported file type: .${ext} (${String(mimeType)})`);
}
