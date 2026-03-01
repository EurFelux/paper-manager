import * as fs from "node:fs";
import * as path from "node:path";

import { Command } from "commander";

import {
  getConfig,
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
import type { KnowledgeBaseMetadata } from "../types/index.js";
import { queryVectorStore } from "../vector-store/index.js";

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

export function createKnowledgeBaseCommand(): Command {
  const kb = new Command("kb").description("Manage knowledge bases");

  kb.command("create <name>")
    .description("Create a knowledge base")
    .requiredOption("-d, --description <desc>", "Knowledge base description")
    .option("-e, --embedding-model <id>", "Embedding model config ID")
    .option("--user", "Create in user scope")
    .action(
      (
        name: string,
        options: {
          description: string;
          embeddingModel?: string;
          user?: boolean;
        },
      ) => {
        let embeddingModelId = options.embeddingModel;
        if (!embeddingModelId) {
          const defaultId = getConfig("defaultEmbeddingModelId");
          if (!defaultId) {
            console.error("Error: No embedding model specified and no default configured.");
            process.exit(1);
          }
          embeddingModelId = defaultId;
        }

        // Validate model config exists
        const models = getConfig("embeddingModels");
        if (!models?.[embeddingModelId]) {
          console.error(`Error: Embedding model "${embeddingModelId}" not found in config.`);
          process.exit(1);
        }

        const create = options.user ? userKb.createKnowledgeBase : projectKb.createKnowledgeBase;

        const result = create({
          name,
          description: options.description,
          embeddingModelId,
        });

        console.log(`Knowledge base created: ${result.id}`);
        console.log(`  Name: ${result.name}`);
        console.log(`  Scope: ${options.user ? "user" : "project"}`);
      },
    );

  kb.command("list")
    .description("List knowledge bases")
    .option("--user", "List user knowledge bases only")
    .option("--all", "List all knowledge bases (default)")
    .action((options: { user?: boolean; all?: boolean }) => {
      let results: Array<KnowledgeBaseMetadata & { scope: string }> = [];

      if (options.user) {
        results = userKb.listKnowledgeBases().map((k) => ({ ...k, scope: "user" }));
      } else {
        const projectKbs = projectKb.listKnowledgeBases().map((k) => ({ ...k, scope: "project" }));
        const userKbs = userKb.listKnowledgeBases().map((k) => ({ ...k, scope: "user" }));
        results = [...projectKbs, ...userKbs];
      }

      if (results.length === 0) {
        console.log("No knowledge bases found.");
        return;
      }

      for (const kb of results) {
        console.log(`[${kb.scope}] ${kb.id}`);
        console.log(`  Name: ${kb.name}`);
        console.log(`  Description: ${kb.description}`);
        console.log(`  Model: ${kb.embeddingModelId}`);
        console.log(`  Created: ${kb.createdAt.toISOString()}`);
        console.log();
      }
    });

  kb.command("remove <id>")
    .description("Remove a knowledge base and all its data")
    .action((id: string) => {
      const resolved = resolveKnowledgeBase(id);
      if (!resolved) {
        console.error(`Knowledge base not found: ${id}`);
        process.exit(1);
      }

      const { scope } = resolved;
      const baseDir = getBaseDir(scope);
      const litOps = scope === "project" ? projectLit : userLit;
      const kbOps = scope === "project" ? projectKb : userKb;

      // 1. Get all literatures in this KB
      const literatures = litOps.getLiteraturesByKnowledgeBaseId(id);

      // 2. Delete PDF files
      const pdfDir = getPdfDir(baseDir);
      for (const lit of literatures) {
        const pdfPath = path.join(pdfDir, `${lit.id}.pdf`);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }

      // 3. Delete literatures from DB
      litOps.deleteLiteraturesByKnowledgeBaseId(id);

      // 4. Delete vector store directory
      const vectorDir = path.join(getVectorStoreDir(baseDir), id);
      if (fs.existsSync(vectorDir)) {
        fs.rmSync(vectorDir, { recursive: true });
      }

      // 5. Delete knowledge base
      kbOps.deleteKnowledgeBase(id);

      console.log(`Knowledge base "${id}" and all associated data removed.`);
    });

  kb.command("query <id> <query-text>")
    .description("Query a knowledge base")
    .option("-k, --top-k <number>", "Number of results", "5")
    .action(async (id: string, queryText: string, options: { topK: string }) => {
      const resolved = resolveKnowledgeBase(id);
      if (!resolved) {
        console.error(`Knowledge base not found: ${id}`);
        process.exit(1);
      }

      const { kb: kbMeta, scope } = resolved;
      const baseDir = getBaseDir(scope);
      const vectorDir = path.join(getVectorStoreDir(baseDir), id);

      if (!fs.existsSync(vectorDir)) {
        console.error("No vector store found for this knowledge base.");
        process.exit(1);
      }

      const modelConfig = getModelConfig(kbMeta.embeddingModelId);
      const k = parseInt(options.topK, 10);
      const results = await queryVectorStore(modelConfig, vectorDir, queryText, k);

      if (results.length === 0) {
        console.log("No results found.");
        return;
      }

      for (let i = 0; i < results.length; i++) {
        const doc = results[i];
        if (!doc) continue;
        console.log(`--- Result ${String(i + 1)} ---`);
        console.log(doc.pageContent);
        if (doc.metadata && Object.keys(doc.metadata).length > 0) {
          console.log(`  Metadata: ${JSON.stringify(doc.metadata)}`);
        }
        console.log();
      }
    });

  return kb;
}
