import { readFile } from "node:fs/promises";

import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

export async function extractPdfContent(pdfPath: string): Promise<Document[]> {
  const data = await readFile(pdfPath);
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  return result.pages.map(
    (page) =>
      new Document({
        pageContent: page.text,
        metadata: {
          source: pdfPath,
          pdf: { totalPages: result.total },
          loc: { pageNumber: page.num },
        },
      }),
  );
}
