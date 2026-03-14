import { existsSync } from "node:fs";
import path from "node:path";

import { Command } from "commander";

import { extractPdfMetadata } from "../extractor/pdf.js";
import { log } from "../logger.js";

export function createUtilCommand(): Command {
  const util = new Command("util").description("Utility commands");

  util
    .command("doi2bib <doi>")
    .description("Convert a DOI to BibTeX citation")
    .action(async (doi: string) => {
      const normalizedDoi = doi.replace(/^https?:\/\/doi\.org\//, "");
      const url = `https://doi.org/${encodeURIComponent(normalizedDoi)}`;

      const response = await fetch(url, {
        headers: { Accept: "application/x-bibtex" },
        redirect: "follow",
      });

      if (!response.ok) {
        log.error(`Failed to resolve DOI: ${normalizedDoi} (HTTP ${String(response.status)})`);
        process.exit(1);
      }

      const bibtex = await response.text();
      log.plain(bibtex);
    });

  util
    .command("pdf-meta <file>")
    .description("Extract metadata from a PDF file")
    .option("--json", "Output as JSON")
    .action(async (file: string, options: { json?: boolean }) => {
      const absolutePath = path.resolve(file);

      if (!existsSync(absolutePath)) {
        log.error(`File not found: ${absolutePath}`);
        process.exit(1);
      }

      if (!absolutePath.toLowerCase().endsWith(".pdf")) {
        log.error("File is not a PDF");
        process.exit(1);
      }

      let meta;
      try {
        meta = await extractPdfMetadata(absolutePath);
      } catch (err) {
        log.error(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      if (options.json) {
        log.plain(JSON.stringify(meta, null, 2));
        return;
      }

      log.header("PDF Metadata");
      log.label("Title:", meta.title ?? "(none)");
      log.label("Author:", meta.author ?? "(none)");
      log.label("Subject:", meta.subject ?? "(none)");
      log.label("Keywords:", meta.keywords.length > 0 ? meta.keywords.join(", ") : "(none)");
      log.label("DOI:", meta.doi ?? "(none)");
      log.label("Creator:", meta.creator ?? "(none)");
      log.label("Created:", meta.creationDate?.toISOString() ?? "(none)");
      log.label("Modified:", meta.modDate?.toISOString() ?? "(none)");
    });

  return util;
}
