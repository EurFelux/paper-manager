import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import * as z from "zod";

import type { EmbeddingModelConfig } from "../types/index.js";
import { EmbeddingModelConfigSchema } from "../types/index.js";

// ─── Path Utilities ─────────────────────────────────────────

const USER_DATA_DIR = path.join(os.homedir(), ".paper-manager");
const DIR_NAME = ".paper-manager";

function findProjectDataDir(): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, DIR_NAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: CWD (no .paper-manager/ found up the tree)
  return path.resolve(DIR_NAME);
}

let cachedProjectDataDir: string | undefined;

export function getUserDataDir(): string {
  return USER_DATA_DIR;
}

/**
 * Returns the project-level `.paper-manager/` directory path, traversing
 * up from CWD. Falls back to CWD if not found. Result is cached per process.
 */
export function getProjectDataDir(): string {
  if (cachedProjectDataDir === undefined) {
    cachedProjectDataDir = findProjectDataDir();
  }
  return cachedProjectDataDir;
}

/** @internal Reset cached project data dir. For testing only. */
export function resetProjectDataDirCache(): void {
  cachedProjectDataDir = undefined;
}

/**
 * Returns CWD-based `.paper-manager/` path without traversal.
 * Used by `config init` to always create in the current directory.
 */
export function getProjectInitDir(): string {
  return path.resolve(DIR_NAME);
}

export function getFilesDir(base: string): string {
  return path.join(base, "files");
}

export function getVectorStoreDir(base: string): string {
  return path.join(base, "vector-stores");
}

function getUserConfigPath(): string {
  return path.join(USER_DATA_DIR, "config.json");
}

function getProjectConfigPath(): string {
  return path.join(getProjectDataDir(), "config.json");
}

// ─── Config Schema Map ─────────────────────────────────────

const configSchemas = {
  embeddingModels: z.record(z.string().min(1), EmbeddingModelConfigSchema),
  defaultEmbeddingModelId: z.string().min(1),
} as const;

type ConfigKeyTypeMap = {
  [K in keyof typeof configSchemas]: z.infer<(typeof configSchemas)[K]>;
};

// ─── Config File I/O ────────────────────────────────────────

export function readConfigFile(filePath: string): Record<string, unknown> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function writeConfigFile(filePath: string, config: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// ─── Config Access ──────────────────────────────────────────

export function loadMergedConfig(): Record<string, unknown> {
  const userConfig = readConfigFile(getUserConfigPath());
  const projectConfig = readConfigFile(getProjectConfigPath());
  return { ...userConfig, ...projectConfig };
}

function getRawConfigValue(key: string): unknown {
  const merged = loadMergedConfig();
  return merged[key];
}

export function getConfig(key: "embeddingModels"): ConfigKeyTypeMap["embeddingModels"] | null;
export function getConfig(
  key: "defaultEmbeddingModelId",
): ConfigKeyTypeMap["defaultEmbeddingModelId"] | null;
export function getConfig(
  key: keyof ConfigKeyTypeMap,
): ConfigKeyTypeMap[keyof ConfigKeyTypeMap] | null {
  const rawValue = getRawConfigValue(key);
  if (rawValue === undefined) return null;

  const schema = configSchemas[key];
  const result = schema.safeParse(rawValue);
  if (!result.success) {
    throw new Error(`Invalid config for "${key}": ${result.error.message}`);
  }
  return result.data;
}

export function setConfig(key: string, value: unknown, options?: { user?: boolean }): void {
  const filePath = options?.user ? getUserConfigPath() : getProjectConfigPath();
  const config = readConfigFile(filePath);
  config[key] = value;
  writeConfigFile(filePath, config);
}

export function removeConfig(key: string, options?: { user?: boolean }): void {
  const filePath = options?.user ? getUserConfigPath() : getProjectConfigPath();
  const config = readConfigFile(filePath);
  delete config[key];
  writeConfigFile(filePath, config);
}

export function listConfig(options?: { user?: boolean }): Record<string, unknown> {
  const filePath = options?.user ? getUserConfigPath() : getProjectConfigPath();
  return readConfigFile(filePath);
}

// ─── Model Config ───────────────────────────────────────────

export function getModelConfig(modelId: string): EmbeddingModelConfig {
  const models = getConfig("embeddingModels");
  if (!models) {
    throw new Error("No embedding models configured");
  }
  const config = models[modelId];
  if (!config) {
    throw new Error(`Model config not found: ${modelId}`);
  }
  return { ...config, id: modelId };
}

export function getDefaultModelConfig(): EmbeddingModelConfig {
  const defaultId = getConfig("defaultEmbeddingModelId");
  if (!defaultId) {
    throw new Error(
      "No default embedding model configured. Set 'defaultEmbeddingModelId' in config.",
    );
  }
  return getModelConfig(defaultId);
}
