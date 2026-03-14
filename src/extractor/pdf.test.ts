import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { extractPdfMetadata } from "./pdf.js";

// ─── Helpers ─────────────────────────────────────────────────

function buildMinimalPdf(info: Record<string, string>): string {
  const infoEntries = Object.entries(info)
    .map(([k, v]) => `/${k} (${v})`)
    .join(" ");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj",
    `4 0 obj\n<< ${infoEntries} >>\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 5\n0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size 5 /Root 1 0 R /Info 4 0 R >>\nstartxref\n${String(xrefOffset)}\n%%EOF`;
  return pdf;
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-test-"));
});

function writePdf(name: string, info: Record<string, string>): string {
  const pdfPath = path.join(tmpDir, name);
  fs.writeFileSync(pdfPath, buildMinimalPdf(info));
  return pdfPath;
}

// ─── extractPdfMetadata ──────────────────────────────────────

describe("extractPdfMetadata", () => {
  it("extracts title, author, subject, and keywords", async () => {
    const pdfPath = writePdf("full.pdf", {
      Title: "Attention Is All You Need",
      Author: "Vaswani, Ashish",
      Subject: "A new network architecture based on attention.",
      Keywords: "transformer, attention, deep learning",
    });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.title).toBe("Attention Is All You Need");
    expect(meta.author).toBe("Vaswani, Ashish");
    expect(meta.subject).toBe("A new network architecture based on attention.");
    expect(meta.keywords).toEqual(["transformer", "attention", "deep learning"]);
  });

  it("extracts creator field", async () => {
    const pdfPath = writePdf("creator.pdf", {
      Creator: "LaTeX with hyperref",
    });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.creator).toBe("LaTeX with hyperref");
  });

  it("parses CreationDate and ModDate", async () => {
    const pdfPath = writePdf("dates.pdf", {
      CreationDate: "D:20231215120000Z",
      ModDate: "D:20240101",
    });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.creationDate).toBeInstanceOf(Date);
    expect(meta.creationDate!.getUTCFullYear()).toBe(2023);
    expect(meta.creationDate!.getUTCMonth()).toBe(11); // December = 11
    expect(meta.creationDate!.getUTCDate()).toBe(15);

    expect(meta.modDate).toBeInstanceOf(Date);
    expect(meta.modDate!.getUTCFullYear()).toBe(2024);
  });

  it("returns null for invalid dates", async () => {
    const pdfPath = writePdf("baddate.pdf", {
      CreationDate: "not-a-date",
    });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.creationDate).toBeNull();
  });

  it("returns null fields and empty keywords when PDF has no metadata", async () => {
    const pdfPath = writePdf("empty.pdf", {});

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.title).toBeNull();
    expect(meta.author).toBeNull();
    expect(meta.subject).toBeNull();
    expect(meta.creator).toBeNull();
    expect(meta.doi).toBeNull();
    expect(meta.creationDate).toBeNull();
    expect(meta.modDate).toBeNull();
    expect(meta.keywords).toEqual([]);
  });

  it("treats empty strings as null", async () => {
    const pdfPath = writePdf("blank.pdf", { Title: "", Author: "  " });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.title).toBeNull();
    expect(meta.author).toBeNull();
  });

  it("splits keywords by semicolons", async () => {
    const pdfPath = writePdf("semicolon.pdf", { Keywords: "NLP; transformers; BERT" });

    const meta = await extractPdfMetadata(pdfPath);
    expect(meta.keywords).toEqual(["NLP", "transformers", "BERT"]);
  });
});
