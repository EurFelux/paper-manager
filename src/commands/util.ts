import { Command } from "commander";

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

  return util;
}
