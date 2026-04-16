import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import chalk from "chalk";
import cliProgress from "cli-progress";
import { Command } from "commander";

import {
  getConfig,
  getFilesDir,
  getModelConfig,
  getProjectDataDir,
  getUserDataDir,
  getVectorStoreDir,
} from "../config/index.js";
import * as projectKb from "../db/project/knowledge-bases.js";
import * as projectLit from "../db/project/literatures.js";
import * as userKb from "../db/user/knowledge-bases.js";
import * as userLit from "../db/user/literatures.js";
import { isHybridBackendAvailable } from "../dep/index.js";
import { extractContent, extractPdfMetadata } from "../extractor/index.js";
import {
  convertPdfToMarkdown,
  isOpendataLoaderAvailable,
  removeImageDir,
  saveConvertResult,
} from "../extractor/markdown.js";
import { log } from "../logger.js";
import { splitDocuments } from "../text-splitter.js";
import type {
  KnowledgeBaseMetadata,
  LiteratureMetadata,
  UpdateLiteratureInput,
} from "../types/index.js";
import type { UnpaywallResponse } from "../unpaywall/index.js";
import { downloadPdf, lookupDoi, normalizeDoi, UnpaywallError } from "../unpaywall/index.js";
import { addDocuments, createVectorStore } from "../vector-store/index.js";
import { outputJson } from "./output.js";

function resolveKnowledgeBase(
  id: string,
): { kb: KnowledgeBaseMetadata; scope: "project" | "user" } | null {
  const pkb = projectKb.getKnowledgeBase(id);
  if (pkb) return { kb: pkb, scope: "project" };
  const ukb = userKb.getKnowledgeBase(id);
  if (ukb) return { kb: ukb, scope: "user" };
  return null;
}

function getBaseDir(scope: "project" | "user"): string {
  return scope === "project" ? getProjectDataDir() : getUserDataDir();
}

function getLitOps(scope: "project" | "user") {
  return scope === "project" ? projectLit : userLit;
}

export function createLiteratureCommand(): Command {
  const lit = new Command("lit").description("Manage literatures");

  // ─── lit add ───────────────────────────────────────────────

  lit
    .command("add <knowledge-base-id> [lit-path]")
    .description("Add a literature from a file (PDF, TXT, MD, TEX, etc.) or by DOI via Unpaywall")
    .option("-t, --title <title>", "Literature title")
    .option("-f, --force", "Force add even if a literature with the same DOI already exists")
    .option("-d, --doi <doi>", "Add paper by DOI (downloads Open Access PDF via Unpaywall)")
    .action(
      async (
        kbId: string,
        litPath: string | undefined,
        options: { title?: string; force?: boolean; doi?: string },
      ) => {
        // Mutual exclusivity check
        if (litPath && options.doi) {
          log.error("Cannot specify both <lit-path> and --doi. Use one or the other.");
          process.exit(1);
        }
        if (!litPath && !options.doi) {
          log.error("Either <lit-path> or --doi is required.");
          process.exit(1);
        }

        const resolved = resolveKnowledgeBase(kbId);
        if (!resolved) {
          log.error(`Knowledge base not found: ${kbId}`);
          process.exit(1);
        }

        const { kb, scope } = resolved;
        const baseDir = getBaseDir(scope);
        const litOps = getLitOps(scope);

        let absolutePath: string;
        let tempDir: string | null = null;
        let doiFromFlag: string | null = null;
        let unpaywallMeta: UnpaywallResponse | null = null;

        if (options.doi) {
          // ─── DOI mode: lookup Unpaywall and download OA PDF ───
          const normalizedDoi = normalizeDoi(options.doi);
          doiFromFlag = normalizedDoi;

          const email = getConfig("email");
          if (!email) {
            log.error(
              'Email is required for Unpaywall API. Set it with: paper config set email "you@example.com"',
            );
            process.exit(1);
          }

          // Check for duplicate DOI before downloading
          if (!options.force) {
            const existing = litOps.findLiteratureByDoi(kbId, normalizedDoi);
            if (existing) {
              log.error(
                `A literature with DOI "${normalizedDoi}" already exists in this knowledge base: ${existing.id} (${existing.title})`,
              );
              log.info("Use --force to add anyway.");
              process.exit(1);
            }
          }

          log.info(`Looking up DOI: ${normalizedDoi}`);
          try {
            unpaywallMeta = await lookupDoi(normalizedDoi, email);
          } catch (err) {
            if (err instanceof UnpaywallError) {
              log.error(err.message);
            } else {
              log.error(
                `Unpaywall lookup failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
            process.exit(1);
          }

          if (!unpaywallMeta.is_oa) {
            log.error(`Paper is not Open Access (status: ${unpaywallMeta.oa_status}).`);
            log.info(`Add it manually: paper lit add ${kbId} <file>`);
            process.exit(1);
          }

          const pdfUrl = unpaywallMeta.best_oa_location?.url_for_pdf;
          if (!pdfUrl) {
            const landingPage = unpaywallMeta.best_oa_location?.url_for_landing_page;
            log.error("Paper is Open Access but no direct PDF URL is available.");
            if (landingPage) {
              log.info(`Landing page: ${landingPage}`);
            }
            log.info(`Download the PDF manually and use: paper lit add ${kbId} <file>`);
            process.exit(1);
          }

          // Show Unpaywall metadata
          log.info("Unpaywall metadata:");
          if (unpaywallMeta.title) log.step(`Title: ${unpaywallMeta.title}`);
          if (unpaywallMeta.z_authors && unpaywallMeta.z_authors.length > 0) {
            log.step(
              `Authors: ${unpaywallMeta.z_authors.map((a) => a.raw_author_name).join(", ")}`,
            );
          }
          if (unpaywallMeta.journal_name) log.step(`Journal: ${unpaywallMeta.journal_name}`);
          if (unpaywallMeta.year) log.step(`Year: ${String(unpaywallMeta.year)}`);
          log.step(`OA Status: ${unpaywallMeta.oa_status}`);

          // Download PDF to temp location
          tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-unpaywall-"));
          absolutePath = path.join(tempDir, `${normalizedDoi.replace(/\//g, "_")}.pdf`);

          log.info("Downloading PDF...");
          try {
            await downloadPdf(pdfUrl, absolutePath);
          } catch (err) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            if (err instanceof UnpaywallError) {
              log.error(err.message);
            } else {
              log.error(`PDF download failed: ${err instanceof Error ? err.message : String(err)}`);
            }
            process.exit(1);
          }
          log.step("PDF downloaded.");
        } else {
          // ─── File mode (existing behavior) ────────────────────
          // litPath is guaranteed to be defined here by the mutual exclusivity check above
          const filePath = litPath ?? "";
          absolutePath = path.resolve(filePath);
          if (!fs.existsSync(absolutePath)) {
            log.error(`File not found: ${absolutePath}`);
            process.exit(1);
          }
        }

        // ─── Shared flow ──────────────────────────────────────
        try {
          log.info("Extracting content...");
          const docs = await extractContent(absolutePath);
          log.step(`Extracted ${String(docs.length)} pages.`);

          // Extract PDF metadata if available
          const isPdf = absolutePath.toLowerCase().endsWith(".pdf");
          const pdfMeta = isPdf ? await extractPdfMetadata(absolutePath) : null;

          if (pdfMeta) {
            const hasAny = pdfMeta.title ?? pdfMeta.author ?? pdfMeta.doi ?? pdfMeta.subject;
            if (hasAny || pdfMeta.keywords.length > 0) {
              log.info("Extracted PDF metadata:");
              if (pdfMeta.title) log.step(`Title: ${pdfMeta.title}`);
              if (pdfMeta.author) log.step(`Author: ${pdfMeta.author}`);
              if (pdfMeta.subject) log.step(`Subject: ${pdfMeta.subject}`);
              if (pdfMeta.doi) log.step(`DOI: ${pdfMeta.doi}`);
              if (pdfMeta.keywords.length > 0) log.step(`Keywords: ${pdfMeta.keywords.join(", ")}`);
              if (pdfMeta.creationDate) log.step(`Created: ${pdfMeta.creationDate.toISOString()}`);
              if (pdfMeta.creator) log.step(`Creator: ${pdfMeta.creator}`);
            }
          }

          // Check for duplicate DOI (file mode only — DOI mode already checked above)
          const effectiveDoi = doiFromFlag ?? pdfMeta?.doi ?? null;
          if (effectiveDoi && !doiFromFlag && !options.force) {
            const existing = litOps.findLiteratureByDoi(kbId, effectiveDoi);
            if (existing) {
              log.error(
                `A literature with DOI "${effectiveDoi}" already exists in this knowledge base: ${existing.id} (${existing.title})`,
              );
              log.info("Use --force to add anyway.");
              process.exit(1);
            }
          }

          // Resolve metadata: CLI option > Unpaywall > PDF metadata > fallback
          const unpaywallAuthors =
            unpaywallMeta?.z_authors && unpaywallMeta.z_authors.length > 0
              ? unpaywallMeta.z_authors.map((a) => a.raw_author_name).join(", ")
              : null;

          const title =
            options.title ??
            unpaywallMeta?.title ??
            pdfMeta?.title ??
            (litPath
              ? path.basename(litPath, path.extname(litPath))
              : (effectiveDoi ?? "Untitled"));

          // Create literature record
          const literature = litOps.createLiterature({
            title,
            titleTranslation: null,
            author: pdfMeta?.author ?? unpaywallAuthors,
            abstract: pdfMeta?.subject ?? null,
            summary: null,
            keywords: pdfMeta?.keywords ?? [],
            url: null,
            doi: effectiveDoi,
            notes: {},
            knowledgeBaseId: kbId,
          });

          // Copy file to storage
          const filesDir = getFilesDir(baseDir);
          const ext = path.extname(absolutePath);
          fs.mkdirSync(filesDir, { recursive: true });
          fs.copyFileSync(absolutePath, path.join(filesDir, `${literature.id}${ext}`));

          // Convert PDF to Markdown if opendataloader is available
          if (isPdf && (await isOpendataLoaderAvailable())) {
            if (!(await isHybridBackendAvailable())) {
              log.step(
                "Hybrid backend (localhost:5002) is not running; using basic conversion. Start the backend for better quality.",
              );
            }
            const result = await convertPdfToMarkdown(absolutePath);
            if (result) {
              saveConvertResult(filesDir, literature.id, result);
              log.step("Converted to Markdown via opendataloader-pdf.");
            }
          }

          // Split text and add to vector store
          log.info("Splitting text...");
          const splitDocs = splitDocuments(docs, { chunkSize: 1000, chunkOverlap: 200 });
          log.step(`Created ${String(splitDocs.length)} chunks.`);

          // Add literature ID metadata to each chunk
          for (const doc of splitDocs) {
            doc.metadata = { ...doc.metadata, literatureId: literature.id };
          }

          const vectorDir = path.join(getVectorStoreDir(baseDir), kbId);
          const modelConfig = getModelConfig(kb.embeddingModelId);

          log.info("Embedding and storing vectors...");
          const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
          bar.start(splitDocs.length, 0);

          // Check if both FAISS index files exist (not just the directory)
          const hasIndex =
            fs.existsSync(path.join(vectorDir, "faiss.index")) &&
            fs.existsSync(path.join(vectorDir, "docstore.json"));
          if (hasIndex) {
            await addDocuments(splitDocs, modelConfig, vectorDir);
          } else {
            await createVectorStore(splitDocs, modelConfig, vectorDir);
          }

          bar.update(splitDocs.length);
          bar.stop();

          log.success(`Literature added: ${literature.id}`);
          log.label("Title:", literature.title);
          if (literature.author) log.label("Author:", literature.author);
          if (literature.abstract) log.label("Abstract:", literature.abstract);
          if (literature.doi) log.label("DOI:", literature.doi);
          if (literature.keywords.length > 0)
            log.label("Keywords:", literature.keywords.join(", "));
        } finally {
          if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        }
      },
    );

  // ─── lit convert ────────────────────────────────────────────

  lit
    .command("convert <id>")
    .description("Convert an existing literature PDF to Markdown via opendataloader-pdf")
    .action(async (id: string) => {
      const found = findLiteratureWithScope(id);
      if (!found) {
        log.error(`Literature not found: ${id}`);
        process.exit(1);
      }

      const filesDir = getFilesDir(getBaseDir(found.scope));
      const pdfFile = findLiteratureFiles(filesDir, id).find((f) => f.endsWith(".pdf"));
      if (!pdfFile) {
        log.error(`No PDF file found for literature: ${id}`);
        process.exit(1);
      }

      const mdPath = path.join(filesDir, `${id}.md`);
      if (fs.existsSync(mdPath)) {
        log.error("Markdown file already exists. Delete it first to reconvert.");
        process.exit(1);
      }

      if (!(await isOpendataLoaderAvailable())) {
        log.error(
          "opendataloader-pdf is not available. Run `paper dep check opendataloader` for details.",
        );
        process.exit(1);
      }

      log.info("Converting PDF to Markdown...");
      const result = await convertPdfToMarkdown(path.join(filesDir, pdfFile));
      if (!result) {
        log.error("Conversion failed.");
        process.exit(1);
      }

      saveConvertResult(filesDir, id, result);
      log.success(`Markdown saved: ${id}.md`);
    });

  // ─── lit remove ────────────────────────────────────────────

  lit
    .command("remove <knowledge-base-id> <id>")
    .description("Remove a literature")
    .action((kbId: string, id: string) => {
      const resolved = resolveKnowledgeBase(kbId);
      if (!resolved) {
        log.error(`Knowledge base not found: ${kbId}`);
        process.exit(1);
      }

      const { scope } = resolved;
      const baseDir = getBaseDir(scope);
      const litOps = getLitOps(scope);

      const literature = litOps.getLiterature(id);
      if (!literature) {
        log.error(`Literature not found: ${id}`);
        process.exit(1);
      }

      // Delete stored files and image directory
      const filesDir = getFilesDir(baseDir);
      if (fs.existsSync(filesDir)) {
        for (const entry of fs.readdirSync(filesDir, { withFileTypes: true })) {
          if (entry.isFile() && entry.name.startsWith(`${id}.`)) {
            fs.unlinkSync(path.join(filesDir, entry.name));
          }
        }
        removeImageDir(filesDir, id);
      }

      // Delete literature record
      litOps.deleteLiterature(id);
      log.success(`Literature "${id}" removed.`);
    });

  // ─── lit update ────────────────────────────────────────────

  lit
    .command("update <knowledge-base-id> <id>")
    .description("Update a literature")
    .option("-t, --title <title>", "Title")
    .option("--title-translation <translation>", "Title translation")
    .option("-a, --author <author>", "Author")
    .option("--abstract <abstract>", "Abstract")
    .option("--summary <summary>", "Summary")
    .option("--url <url>", "URL")
    .option("--doi <doi>", "DOI")
    .option("--keywords <keywords>", "Keywords (comma-separated)")
    .action(
      (
        kbId: string,
        id: string,
        options: {
          title?: string;
          titleTranslation?: string;
          author?: string;
          abstract?: string;
          summary?: string;
          url?: string;
          doi?: string;
          keywords?: string;
        },
      ) => {
        const resolved = resolveKnowledgeBase(kbId);
        if (!resolved) {
          log.error(`Knowledge base not found: ${kbId}`);
          process.exit(1);
        }

        const litOps = getLitOps(resolved.scope);
        const input: UpdateLiteratureInput = {
          ...(options.title !== undefined && { title: options.title }),
          ...(options.titleTranslation !== undefined && {
            titleTranslation: options.titleTranslation,
          }),
          ...(options.author !== undefined && { author: options.author }),
          ...(options.abstract !== undefined && { abstract: options.abstract }),
          ...(options.summary !== undefined && { summary: options.summary }),
          ...(options.url !== undefined && { url: options.url }),
          ...(options.doi !== undefined && { doi: options.doi }),
          ...(options.keywords !== undefined && {
            keywords: options.keywords.split(",").map((k) => k.trim()),
          }),
        };

        const updated = litOps.updateLiterature(id, input);
        if (!updated) {
          log.error(`Literature not found: ${id}`);
          process.exit(1);
        }

        log.success(`Literature "${id}" updated.`);
      },
    );

  // ─── lit list ──────────────────────────────────────────────

  lit
    .command("list <knowledge-base-id>")
    .description("List literatures in a knowledge base")
    .option("--json", "Output as JSON")
    .option("--jq <expression>", "Filter JSON output with a jq expression (implies --json)")
    .action((kbId: string, options: { json?: boolean; jq?: string }) => {
      const resolved = resolveKnowledgeBase(kbId);
      if (!resolved) {
        log.error(`Knowledge base not found: ${kbId}`);
        process.exit(1);
      }

      const litOps = getLitOps(resolved.scope);
      const literatures = litOps.listLiteratures(kbId);

      if (literatures.length === 0) {
        if (options.json || options.jq) {
          outputJson([], options.jq);
        } else {
          log.info("No literatures found.");
        }
        return;
      }

      if (options.json || options.jq) {
        outputJson(literatures, options.jq);
        return;
      }

      const filesDir = getFilesDir(getBaseDir(resolved.scope));

      for (const l of literatures) {
        log.header(l.id);
        log.label("Title:", l.title);
        if (l.author) log.label("Author:", l.author);
        const files = findLiteratureFiles(filesDir, l.id);
        log.label("Files:", files.length > 0 ? files.join(", ") : "(none)");
        log.label("Created:", l.createdAt.toISOString());
        log.newline();
      }
      log.count(literatures.length, literatures.length === 1 ? "literature" : "literatures");
    });

  // ─── lit search ────────────────────────────────────────────

  lit
    .command("search <knowledge-base-id>")
    .description("Search literatures in a knowledge base by metadata")
    .option("-t, --title <title>", "Title substring")
    .option("-a, --author <author>", "Author substring")
    .option("-k, --keyword <keyword>", "Keyword substring")
    .option("--doi <doi>", "DOI substring")
    .option("--json", "Output as JSON")
    .option("--jq <expression>", "Filter JSON output with a jq expression (implies --json)")
    .action(
      (
        kbId: string,
        options: {
          title?: string;
          author?: string;
          keyword?: string;
          doi?: string;
          json?: boolean;
          jq?: string;
        },
      ) => {
        const resolved = resolveKnowledgeBase(kbId);
        if (!resolved) {
          log.error(`Knowledge base not found: ${kbId}`);
          process.exit(1);
        }

        if (
          options.title === undefined &&
          options.author === undefined &&
          options.keyword === undefined &&
          options.doi === undefined
        ) {
          log.error("At least one filter (--title, --author, --keyword, --doi) is required.");
          process.exit(1);
        }

        const litOps = getLitOps(resolved.scope);
        const results = litOps.searchLiteratures(kbId, {
          title: options.title,
          author: options.author,
          keyword: options.keyword,
          doi: options.doi,
        });

        if (results.length === 0) {
          if (options.json || options.jq) {
            outputJson([], options.jq);
          } else {
            log.info("No literatures found.");
          }
          return;
        }

        if (options.json || options.jq) {
          outputJson(results, options.jq);
          return;
        }

        for (const l of results) {
          log.header(l.id);
          log.label("Title:", l.title);
          if (l.author) log.label("Author:", l.author);
          if (l.doi) log.label("DOI:", l.doi);
          if (l.keywords.length > 0) log.label("Keywords:", l.keywords.join(", "));
          log.label("Created:", l.createdAt.toISOString());
          log.newline();
        }
        log.count(results.length, results.length === 1 ? "literature" : "literatures");
      },
    );

  // ─── lit show ──────────────────────────────────────────────

  lit
    .command("show <knowledge-base-id> <id>")
    .description("Show literature details")
    .option("--json", "Output as JSON")
    .option("--jq <expression>", "Filter JSON output with a jq expression (implies --json)")
    .action((kbId: string, id: string, options: { json?: boolean; jq?: string }) => {
      const resolved = resolveKnowledgeBase(kbId);
      if (!resolved) {
        log.error(`Knowledge base not found: ${kbId}`);
        process.exit(1);
      }

      const litOps = getLitOps(resolved.scope);
      const literature = litOps.getLiterature(id);

      if (!literature) {
        log.error(`Literature not found: ${id}`);
        process.exit(1);
      }

      if (options.json || options.jq) {
        outputJson(literature, options.jq);
        return;
      }

      const filesDir = getFilesDir(getBaseDir(resolved.scope));
      printLiterature(literature, filesDir);
    });

  // ─── lit note ──────────────────────────────────────────────

  const note = lit.command("note").description("Manage literature notes");

  note
    .command("list <literature-id>")
    .description("List all notes for a literature")
    .option("--json", "Output as JSON")
    .option("--jq <expression>", "Filter JSON output with a jq expression (implies --json)")
    .action((litId: string, options: { json?: boolean; jq?: string }) => {
      const literature = findLiterature(litId);
      if (!literature) {
        log.error(`Literature not found: ${litId}`);
        process.exit(1);
      }

      if (options.json || options.jq) {
        outputJson(literature.notes, options.jq);
        return;
      }

      const entries = Object.entries(literature.notes);
      if (entries.length === 0) {
        log.info("No notes found.");
        return;
      }

      for (const [key, value] of entries) {
        log.label(`${key}:`, value);
      }
      log.newline();
      log.count(entries.length, entries.length === 1 ? "note" : "notes");
    });

  note
    .command("set <literature-id> <key> <value>")
    .description("Set a note on a literature")
    .action((litId: string, key: string, value: string) => {
      const found = findLiteratureWithScope(litId);
      if (!found) {
        log.error(`Literature not found: ${litId}`);
        process.exit(1);
      }

      const litOps = getLitOps(found.scope);
      const newNotes = { ...found.literature.notes, [key]: value };
      litOps.updateLiterature(litId, { notes: newNotes });
      log.success(`Note "${key}" set on literature "${litId}".`);
    });

  note
    .command("remove <literature-id> <key>")
    .description("Remove a note from a literature")
    .action((litId: string, key: string) => {
      const found = findLiteratureWithScope(litId);
      if (!found) {
        log.error(`Literature not found: ${litId}`);
        process.exit(1);
      }

      const litOps = getLitOps(found.scope);
      const newNotes = { ...found.literature.notes };
      delete newNotes[key];
      litOps.updateLiterature(litId, { notes: newNotes });
      log.success(`Note "${key}" removed from literature "${litId}".`);
    });

  return lit;
}

// ─── Helpers ────────────────────────────────────────────────

function findLiterature(id: string): LiteratureMetadata | null {
  return projectLit.getLiterature(id) ?? userLit.getLiterature(id);
}

function findLiteratureWithScope(
  id: string,
): { literature: LiteratureMetadata; scope: "project" | "user" } | null {
  const pLit = projectLit.getLiterature(id);
  if (pLit) return { literature: pLit, scope: "project" };
  const uLit = userLit.getLiterature(id);
  if (uLit) return { literature: uLit, scope: "user" };
  return null;
}

function findLiteratureFiles(filesDir: string, id: string): string[] {
  if (!fs.existsSync(filesDir)) return [];
  return fs
    .readdirSync(filesDir)
    .filter((name) => name.startsWith(`${id}.`))
    .sort();
}

function printLiterature(lit: LiteratureMetadata, filesDir: string): void {
  log.header(lit.id);
  log.label("Title:", lit.title);
  if (lit.titleTranslation) log.label("Title (translated):", lit.titleTranslation);
  if (lit.author) log.label("Author:", lit.author);
  if (lit.abstract) log.label("Abstract:", lit.abstract);
  if (lit.summary) log.label("Summary:", lit.summary);
  if (lit.keywords.length > 0) log.label("Keywords:", lit.keywords.join(", "));
  if (lit.url) log.label("URL:", lit.url);
  if (lit.doi) log.label("DOI:", lit.doi);
  if (lit.knowledgeBaseId) log.label("Knowledge Base:", lit.knowledgeBaseId);
  const files = findLiteratureFiles(filesDir, lit.id);
  log.label("Files:", files.length > 0 ? files.join(", ") : "(none)");
  log.label("Created:", lit.createdAt.toISOString());
  log.label("Updated:", lit.updatedAt.toISOString());

  const noteEntries = Object.entries(lit.notes);
  if (noteEntries.length > 0) {
    log.plain(chalk.dim("Notes:"));
    for (const [key, value] of noteEntries) {
      log.label(`  ${key}:`, value);
    }
  }
}
