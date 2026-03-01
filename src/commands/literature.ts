import * as fs from "node:fs";
import * as path from "node:path";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import chalk from "chalk";
import cliProgress from "cli-progress";
import { Command } from "commander";

import {
  getModelConfig,
  getPdfDir,
  getProjectDataDir,
  getUserDataDir,
  getVectorStoreDir,
} from "../config/index.js";
import * as projectKb from "../db/project/knowledge-bases.js";
import * as projectLit from "../db/project/literatures.js";
import * as userKb from "../db/user/knowledge-bases.js";
import * as userLit from "../db/user/literatures.js";
import { log } from "../logger.js";
import { extractPdfContent } from "../pdf/extractor.js";
import type { KnowledgeBaseMetadata, LiteratureMetadata } from "../types/index.js";
import { createVectorStore, loadVectorStore } from "../vector-store/index.js";

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
    .command("add <knowledge-base-id> <pdf-path>")
    .description("Add a literature from a PDF file")
    .option("-t, --title <title>", "Literature title")
    .action(async (kbId: string, pdfPath: string, options: { title?: string }) => {
      const resolved = resolveKnowledgeBase(kbId);
      if (!resolved) {
        log.error(`Knowledge base not found: ${kbId}`);
        process.exit(1);
      }

      const { kb, scope } = resolved;
      const baseDir = getBaseDir(scope);
      const litOps = getLitOps(scope);

      // Resolve PDF path
      const absolutePdfPath = path.resolve(pdfPath);
      if (!fs.existsSync(absolutePdfPath)) {
        log.error(`PDF file not found: ${absolutePdfPath}`);
        process.exit(1);
      }

      const title = options.title ?? path.basename(pdfPath, path.extname(pdfPath));

      log.info("Extracting PDF content...");
      const docs = await extractPdfContent(absolutePdfPath);
      log.step(`Extracted ${String(docs.length)} pages.`);

      // Create literature record
      const literature = litOps.createLiterature({
        title,
        titleTranslation: null,
        author: null,
        abstract: null,
        summary: null,
        keywords: [],
        url: null,
        notes: {},
        knowledgeBaseId: kbId,
      });

      // Copy PDF to storage
      const pdfDir = getPdfDir(baseDir);
      fs.mkdirSync(pdfDir, { recursive: true });
      fs.copyFileSync(absolutePdfPath, path.join(pdfDir, `${literature.id}.pdf`));

      // Split text and add to vector store
      log.info("Splitting text...");
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await splitter.splitDocuments(docs);
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

      // Check if vector store already exists
      if (fs.existsSync(vectorDir)) {
        const store = await loadVectorStore(modelConfig, vectorDir);
        await store.addDocuments(splitDocs);
        await store.save(vectorDir);
      } else {
        fs.mkdirSync(vectorDir, { recursive: true });
        await createVectorStore(splitDocs, modelConfig, vectorDir);
      }

      bar.update(splitDocs.length);
      bar.stop();

      log.success(`Literature added: ${literature.id}`);
      log.label("Title:", literature.title);
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

      // Delete PDF
      const pdfPath = path.join(getPdfDir(baseDir), `${id}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
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
          keywords?: string;
        },
      ) => {
        const resolved = resolveKnowledgeBase(kbId);
        if (!resolved) {
          log.error(`Knowledge base not found: ${kbId}`);
          process.exit(1);
        }

        const litOps = getLitOps(resolved.scope);
        const input: Record<string, unknown> = {};

        if (options.title !== undefined) input["title"] = options.title;
        if (options.titleTranslation !== undefined)
          input["titleTranslation"] = options.titleTranslation;
        if (options.author !== undefined) input["author"] = options.author;
        if (options.abstract !== undefined) input["abstract"] = options.abstract;
        if (options.summary !== undefined) input["summary"] = options.summary;
        if (options.url !== undefined) input["url"] = options.url;
        if (options.keywords !== undefined)
          input["keywords"] = options.keywords.split(",").map((k) => k.trim());

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
    .action((kbId: string) => {
      const resolved = resolveKnowledgeBase(kbId);
      if (!resolved) {
        log.error(`Knowledge base not found: ${kbId}`);
        process.exit(1);
      }

      const litOps = getLitOps(resolved.scope);
      const literatures = litOps.listLiteratures(kbId);

      if (literatures.length === 0) {
        log.info("No literatures found.");
        return;
      }

      for (const l of literatures) {
        log.header(l.id);
        log.label("Title:", l.title);
        if (l.author) log.label("Author:", l.author);
        log.label("Created:", l.createdAt.toISOString());
        log.newline();
      }
    });

  // ─── lit show ──────────────────────────────────────────────

  lit
    .command("show <knowledge-base-id> <id>")
    .description("Show literature details")
    .action((kbId: string, id: string) => {
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

      printLiterature(literature);
    });

  // ─── lit note ──────────────────────────────────────────────

  const note = lit.command("note").description("Manage literature notes");

  note
    .command("list <literature-id>")
    .description("List all notes for a literature")
    .action((litId: string) => {
      const literature = findLiterature(litId);
      if (!literature) {
        log.error(`Literature not found: ${litId}`);
        process.exit(1);
      }

      const entries = Object.entries(literature.notes);
      if (entries.length === 0) {
        log.info("No notes found.");
        return;
      }

      for (const [key, value] of entries) {
        log.label(`${key}:`, value);
      }
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

function printLiterature(lit: LiteratureMetadata): void {
  log.header(lit.id);
  log.label("Title:", lit.title);
  if (lit.titleTranslation) log.label("Title (translated):", lit.titleTranslation);
  if (lit.author) log.label("Author:", lit.author);
  if (lit.abstract) log.label("Abstract:", lit.abstract);
  if (lit.summary) log.label("Summary:", lit.summary);
  if (lit.keywords.length > 0) log.label("Keywords:", lit.keywords.join(", "));
  if (lit.url) log.label("URL:", lit.url);
  log.label("Knowledge Base:", lit.knowledgeBaseId);
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
