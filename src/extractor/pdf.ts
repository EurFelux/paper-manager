import { readFile } from "node:fs/promises";

import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

export interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  keywords: string[];
  doi: string | null;
  creator: string | null;
  creationDate: Date | null;
  modDate: Date | null;
}

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

export async function extractPdfMetadata(pdfPath: string): Promise<PdfMetadata> {
  const data = await readFile(pdfPath);
  const parser = new PDFParse({ data });
  const result = await parser.getInfo();
  await parser.destroy();

  const info = result.info as Record<string, unknown> | undefined;
  const custom = info?.["Custom"] as Record<string, unknown> | undefined;

  const title = nonEmptyStringOrNull(info?.["Title"]);
  const author = nonEmptyStringOrNull(info?.["Author"]);
  const subject = nonEmptyStringOrNull(info?.["Subject"]);
  const creator = nonEmptyStringOrNull(info?.["Creator"]);
  const creationDate = parsePdfDate(nonEmptyStringOrNull(info?.["CreationDate"]));
  const modDate = parsePdfDate(nonEmptyStringOrNull(info?.["ModDate"]));

  const rawKeywords = nonEmptyStringOrNull(info?.["Keywords"]);
  const keywords = rawKeywords
    ? rawKeywords
        .split(/[,;]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  // DOI can appear in Custom fields (case-insensitive lookup)
  const doi = findCustomField(custom, "doi");

  return { title, author, subject, keywords, doi, creator, creationDate, modDate };
}

function nonEmptyStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

/**
 * Parse PDF date format: D:YYYYMMDDHHmmSSOHH'mm
 * Examples: "D:20231215120000Z", "D:20231215", "D:20231215120000+08'00"
 */
function parsePdfDate(value: string | null): Date | null {
  if (!value) return null;
  const cleaned = value.replace(/^D:/, "");

  // Extract components: YYYY[MM[DD[HH[mm[SS]]]]]
  const match = /^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(cleaned);
  if (!match) return null;

  const year = match[1]!;
  const month = match[2] ?? "01";
  const day = match[3] ?? "01";
  const hour = match[4] ?? "00";
  const min = match[5] ?? "00";
  const sec = match[6] ?? "00";

  const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Case-insensitive lookup in the Custom fields dictionary.
 */
function findCustomField(custom: Record<string, unknown> | undefined, key: string): string | null {
  if (!custom) return null;
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(custom)) {
    if (k.toLowerCase() === lowerKey) {
      return nonEmptyStringOrNull(v);
    }
  }
  return null;
}
