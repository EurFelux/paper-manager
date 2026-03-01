import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as z from "zod";
import { type EmbeddingModelConfig, EmbeddingModelConfigSchema } from "../types/index.js";

// ─── Path Utilities ─────────────────────────────────────────

const USER_DATA_DIR = path.join(os.homedir(), ".paper-manager");
const PROJECT_DATA_DIR = path.resolve(".paper-manager");

export function getUserDataDir(): string {
  return USER_DATA_DIR;
}

export function getProjectDataDir(): string {
  return PROJECT_DATA_DIR;
}

export function getPdfDir(base: string): string {
  return path.join(base, "pdfs");
}

export function getVectorStoreDir(base: string): string {
  return path.join(base, "vector-stores");
}

function getUserConfigPath(): string {
  return path.join(USER_DATA_DIR, "config.json");
}

function getProjectConfigPath(): string {
  return path.join(PROJECT_DATA_DIR, "config.json");
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
