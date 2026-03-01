# 架构设计文档

## 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 关系数据库 | better-sqlite3 | 本地文件、零配置、同步 API |
| 向量存储 | FaissStore | LangChain 集成、本地文件持久化 |
| PDF 解析 | @langchain/community PDFLoader | 与 LangChain 生态集成 |
| CLI 框架 | commander | 已在依赖中 |
| 验证 | zod | 已在依赖中 |

## 目录结构

```
src/
├── types/
│   └── index.ts          # 数据模型类型定义
├── db/
│   ├── index.ts          # SQLite 连接管理（user + project 双库）
│   ├── schema.ts         # 表结构定义
│   ├── user/             # User DB 操作
│   │   ├── literatures.ts
│   │   └── knowledge-bases.ts
│   └── project/          # Project DB 操作
│       ├── literatures.ts
│       └── knowledge-bases.ts
├── ai/
│   ├── index.ts          # AI 模块入口
│   ├── embed.ts          # 文本嵌入接口（基于 ai SDK）
│   └── provider.ts       # AI SDK provider 创建（基于 EmbeddingModelConfig）
├── vector-store/
│   ├── index.ts          # FaissStore 向量存储封装
│   └── embeddings.ts     # LangChain Embeddings 适配器（包装 ai 模块）
├── pdf/
│   └── extractor.ts      # PDF 内容提取
├── commands/
│   ├── literature.ts     # 文献管理 CLI 命令
│   ├── knowledge-base.ts # 知识库 CLI 命令
│   └── config.ts         # 配置管理命令
├── config/
│   └── index.ts          # 配置层级管理（user + project）
└── index.ts              # CLI 入口
```

## 数据模型（Zod Schema First）

### 基础配置 Schema
```typescript
import { z } from "zod";

// 模型配置（不包含 id，id 由 config.json 的 key 决定）
export const EmbeddingModelConfigSchema = z.object({
  provider: z.enum(['openai']),
  model: z.string(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string(),
  /** 可用户填写，也可运行时获取 */
  dimensions: z.number().int().positive(),
});

// 运行时使用的完整模型配置（包含注入的 id）
export type EmbeddingModelConfig = z.infer<typeof EmbeddingModelConfigSchema> & {
  id: string;
};
```

### 知识库 Schema
```typescript
import { z } from "zod";

export const KnowledgeBaseMetadataSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string(),
  embeddingModelId: z.string().min(1),  // 引用 Config 中的模型配置 ID
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KnowledgeBaseMetadata = z.infer<typeof KnowledgeBaseMetadataSchema>;
```

### 文献 Schema
```typescript
import { z } from "zod";

export const LiteratureMetadataSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  titleTranslation: z.string().nullable(),
  author: z.string().nullable(),
  abstract: z.string().nullable(),
  summary: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
  url: z.string().url().nullable(),
  notes: z.record(z.string(), z.string()).default({}),
  knowledgeBaseId: z.uuid(),  // 必须关联到知识库
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LiteratureMetadata = z.infer<typeof LiteratureMetadataSchema>;

// 用于创建新文献（不含 id, createdAt, updatedAt）
export const CreateLiteratureSchema = LiteratureMetadataSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLiteratureInput = z.infer<typeof CreateLiteratureSchema>;

// 用于更新文献（所有字段可选）
export const UpdateLiteratureSchema = CreateLiteratureSchema.partial();

export type UpdateLiteratureInput = z.infer<typeof UpdateLiteratureSchema>;
```

### 配置 Schema
```typescript
import { z } from "zod";
import { EmbeddingModelConfigSchema } from "./config";

export const ConfigSchema = z.object({
  // 嵌入模型配置映射表（key 作为配置 ID，value 不包含 id 字段）
  embeddingModels: z.record(z.string().min(1), EmbeddingModelConfigSchema).default({}),
  // 默认使用的模型配置 ID
  defaultEmbeddingModelId: z.string().min(1).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### 输入验证示例
```typescript
// 验证用户输入
const result = CreateLiteratureSchema.safeParse(userInput);
if (!result.success) {
  console.error(result.error.format());
}

// 从数据库行转换
function fromDbRow(row: unknown): LiteratureMetadata {
  return LiteratureMetadataSchema.parse({
    ...row,
    keywords: JSON.parse(row.keywords),
    notes: JSON.parse(row.notes),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
```

## CLI 命令设计

### 文献管理
```bash
# 添加文献
paper lit add <knowledge-base-id> <pdf-path>

# 删除文献
paper lit remove <knowledge-base-id> <id>

# 更新文献
paper lit update <knowledge-base-id> <id> [--title <title>] [--author <author>] ...

# 列出文献
paper lit list <knowledge-base-id>

# 查看详情
paper lit show <knowledge-base-id> <id>

# 笔记管理
paper lit note <subcommand> [args]
```

#### 笔记管理 (lit note)
```bash
paper lit note list <literature-id>              # 列出所有笔记
paper lit note set <literature-id> <key> <value> # 添加/更新笔记项
paper lit note remove <literature-id> <key>      # 删除笔记项
```

### 知识库管理
```bash
# 创建知识库（默认 Project 层级，--user 创建到 User DB）
paper kb create <name> --description <desc> [--embedding-model <model_config_id>] [--user]

# 列出知识库（--all 同时列出 User 和 Project，--user 仅列出 User，默认--all）
paper kb list [--all | --user]

# 删除知识库
paper kb remove <id>

# 查询知识库（优先查 Project，找不到查 User）
paper kb query <id> <query-text>
```

### 配置管理
```bash
# 查看配置（--user 查看全局配置，否则查看项目配置）
paper config get <key> [--user]

# 设置配置
paper config set <key> <value> [--user]

# 删除配置项
paper config remove <key> [--user]

# 列出所有配置
paper config list [--user]

# 常用配置项
# - embeddingModels: 嵌入模型配置映射表
# - defaultEmbeddingModelId: 默认模型配置 ID
```

## 核心代码示例

### PDF 加载
```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const loader = new PDFLoader(pdfPath, { splitPages: true });
const docs = await loader.load();
// docs[0].pageContent - 页面内容
// docs[0].metadata - { source, pdf: { version, info, metadata, totalPages }, loc: { pageNumber } }
```

### AI 嵌入（ai SDK）
```typescript
import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// 创建 provider（基于 EmbeddingModelConfig）
function createProvider(config: EmbeddingModelConfig) {
  const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  return openai.embedding(config.model);
}

// 单文本嵌入
const { embedding } = await embed({
  model: createProvider(config),
  value: "text to embed",
});

// 批量嵌入
const { embeddings } = await embedMany({
  model: createProvider(config),
  values: ["text1", "text2", "text3"],
});
```

### 向量存储（FaissStore + ai SDK）

**ai 模块提供嵌入函数**（`src/ai/embed.ts`）：
```typescript
import { embed, embedMany } from "./ai/embed";

// 单文本嵌入
const embedding = await embed(config, "text to embed");
// 返回: number[]

// 批量嵌入
const embeddings = await embedMany(config, ["text1", "text2"]);
// 返回: number[][]
```

**适配器包装为 LangChain Embeddings**（`src/vector-store/embeddings.ts`）：
```typescript
import { Embeddings } from "@langchain/core/embeddings";
import { embed, embedMany } from "../ai/embed";
import type { EmbeddingModelConfig } from "../types";

export class AiSdkEmbeddings extends Embeddings {
  constructor(private config: EmbeddingModelConfig) {
    super({});
  }

  async embedQuery(document: string): Promise<number[]> {
    return embed(this.config, document);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return embedMany(this.config, documents);
  }
}
```

**使用 FaissStore**（`src/vector-store/index.ts`）：
```typescript
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { AiSdkEmbeddings } from "./embeddings";
import { getModelConfig } from "../config";

// 通过 embeddingModelId 获取完整配置
const modelConfig = getModelConfig(kb.embeddingModelId);
const embeddings = new AiSdkEmbeddings(modelConfig);
const vectorStore = await FaissStore.fromDocuments(docs, embeddings);
await vectorStore.save(directory);

// 加载已有存储
const loadedStore = await FaissStore.load(directory, embeddings);

// 相似度搜索
const results = await loadedStore.similaritySearch(query, k);
```

## 数据存储（双 SQLite 设计）

### 数据库分层

| 层级 | 路径 | 存储内容 | 典型用途 |
|------|------|----------|----------|
| **User DB** | `~/.paper-manager/papers.db` | 全局配置、API 密钥、个人知识库、个人文献 | 跨项目复用的资源 |
| **Project DB** | `./.paper-manager/papers.db` | 项目专属知识库、项目文献、项目配置 | 项目内资源，可版本控制 |

### DB Schema

User DB 和 Project DB 使用相同的表结构：

```sql
CREATE TABLE knowledge_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    embedding_model_id TEXT NOT NULL,  -- 引用 config.json 中的模型配置 ID
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE literatures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_translation TEXT,
    author TEXT,
    abstract TEXT,
    summary TEXT,
    keywords TEXT NOT NULL DEFAULT '[]',
    url TEXT,
    notes TEXT NOT NULL DEFAULT '{}',
    knowledge_base_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE SET NULL
);
```

### 数据目录结构
```
~/.paper-manager/                       # User 数据目录
├── papers.db                           # User SQLite
├── config.json                         # 用户全局配置
├── pdfs/                               # 个人文献 PDF 存储
│   └── <literature-id>.pdf            # 以文献 ID 为文件名
└── vector-stores/                      # 个人知识库向量存储
    └── <kb-id>/

<project_dir>/.paper-manager/                       # Project 数据目录（相对于项目根）
├── papers.db                           # Project SQLite
├── config.json                         # 项目配置（可版本控制）
├── pdfs/                               # 项目文献 PDF 存储
│   └── <literature-id>.pdf             # 以文献 ID 为文件名
└── vector-stores/                      # 项目知识库向量存储
    └── <kb-id>/
```

### 配置层级与优先级
配置优先级（从高到低）：
1. Project 配置（`./.paper-manager/config.json`）
2. User 配置（`~/.paper-manager/config.json`）
3. 默认值

```jsonc
// config.json 示例
{
  "embeddingModels": {
    // key 即配置 ID，value 不需要包含 id 字段
    "openai-small": {
      "provider": "openai",
      "model": "text-embedding-3-small",
      "apiKey": "sk-...",  // 直接从配置文件读取
      "dimensions": 1536
    },
    "openai-large": {
      "provider": "openai",
      "model": "text-embedding-3-large",
      "apiKey": "sk-...",
      "dimensions": 3072
    }
  },
  "defaultEmbeddingModelId": "openai-small"
}
```

```typescript
// 配置 key 到验证 schema 的映射
const configSchemas = {
  embeddingModels: z.record(z.string().min(1), EmbeddingModelConfigSchema),
  defaultEmbeddingModelId: z.string().min(1),
} as const;

type ConfigKeyTypeMap = {
  [K in keyof typeof configSchemas]: z.infer<typeof configSchemas[K]>;
};

// 读取并合并配置（Project 配置覆盖 User 配置）
function loadMergedConfig(): Record<string, unknown> {
  const userConfig = readConfigFile(getUserConfigPath());
  const projectConfig = readConfigFile(getProjectConfigPath());
  // Project 配置优先级更高，覆盖 User 配置
  return { ...userConfig, ...projectConfig };
}

// 从合并后的配置获取原始值
function getRawConfigValue(key: string): unknown {
  const merged = loadMergedConfig();
  return merged[key];
}

// 类型安全的配置读取（带运行时验证）
function getConfig<K extends keyof ConfigKeyTypeMap>(
  key: K
): ConfigKeyTypeMap[K] | null {
  const rawValue = getRawConfigValue(key);
  if (rawValue === undefined) return null;

  const result = configSchemas[key].safeParse(rawValue);
  if (!result.success) {
    throw new Error(`Invalid config for "${key}": ${result.error.message}`);
  }
  return result.data;
}

// 获取模型配置（注入 id）
function getModelConfig(modelId: string): EmbeddingModelConfig {
  const models = getConfig("embeddingModels");
  if (!models) {
    throw new Error("No embedding models configured");
  }
  const config = models[modelId];
  if (!config) {
    throw new Error(`Model config not found: ${modelId}`);
  }
  // 注入 id 字段
  return { ...config, id: modelId };
}
```

### 跨库查询机制

**项目在 User KB 中检索**
```typescript
// 优先查 Project DB，找不到时回退到 User DB
const kb = projectDb.getKnowledgeBase(id) ?? userDb.getKnowledgeBase(id);
```

**说明**：Project 和 User DB 完全独立，无数据引用关系。跨库查询仅在运行时按优先级查找，不持久化引用关系。

### 删除知识库清理流程

删除知识库时需要级联清理以下资源：

```typescript
async function removeKnowledgeBase(kbId: string): Promise<void> {
  // 1. 查询该知识库下的所有文献
  const literatures = db.getLiteraturesByKnowledgeBaseId(kbId);

  // 2. 删除每个文献关联的 PDF 文件
  for (const lit of literatures) {
    const pdfPath = getPdfPath(lit.id);
    if (await fileExists(pdfPath)) {
      await deleteFile(pdfPath);
    }
  }

  // 3. 删除文献元数据（SQLite 外键约束会自动处理）
  db.deleteLiteraturesByKnowledgeBaseId(kbId);

  // 4. 删除向量存储目录
  const vectorStorePath = getVectorStorePath(kbId);
  if (await directoryExists(vectorStorePath)) {
    await deleteDirectory(vectorStorePath);
  }

  // 5. 删除知识库元数据
  db.deleteKnowledgeBase(kbId);
}
```

**注意**：由于 SQLite 的 `ON DELETE SET NULL`，删除知识库后，其文献的 `knowledge_base_id` 会被设为 NULL，但文献记录和 PDF 文件需要显式清理。

### 创建知识库时的模型配置验证

```typescript
function createKnowledgeBase(input: CreateKnowledgeBaseInput): KnowledgeBase {
  // 验证引用的模型配置存在
  const models = getConfig("embeddingModels");
  if (!models || !models[input.embeddingModelId]) {
    throw new Error(`Embedding model "${input.embeddingModelId}" not found in config`);
  }

  // 继续创建知识库...
}
```

## 依赖

- `better-sqlite3` - SQLite 数据库
- `@langchain/community` - LangChain 社区集成（PDFLoader、FaissStore）
- `faiss-node` - Faiss 向量库 Node.js 绑定
- `ai` - AI SDK
- `@ai-sdk/openai` - OpenAI 提供商

## 备注

- Faiss 是 Facebook 开源的高性能向量搜索库
- 需安装编译工具（node-gyp）以编译 faiss-node
