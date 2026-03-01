# 架构文档

## 项目概述

Paper Manager 是一个基于 CLI 的学术论文管理系统，支持 PDF 导入、元数据管理、语义搜索和笔记功能。系统采用本地优先（local-first）设计，所有数据存储在本地文件系统中，无需云服务依赖。

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    CLI 入口 (commander)               │
│                     src/index.ts                     │
├──────────┬──────────────┬────────────────────────────┤
│ config   │ knowledge-base│       literature           │
│ 配置管理  │ 知识库管理    │       文献管理              │
├──────────┴──────────────┴────────────────────────────┤
│                     业务逻辑层                        │
├──────────┬──────────────┬───────────┬────────────────┤
│ config/  │     db/      │ vector-  │    pdf/         │
│ 配置管理  │  数据库操作   │ store/   │  PDF 解析       │
│          │             │ 向量存储   │                 │
├──────────┤             ├───────────┤                 │
│  JSON    │  SQLite     │  Faiss    │  LangChain      │
│  文件    │ better-     │  faiss-   │  PDFLoader      │
│         │ sqlite3     │  node     │                 │
├──────────┴──────────────┼───────────┘                 │
│                         │                             │
│                      ai/                              │
│              AI 嵌入层 (Vercel AI SDK)                 │
│              ↕ AiSdkEmbeddings 适配器                  │
│              LangChain Embeddings 接口                 │
└─────────────────────────────────────────────────────┘
```

## 核心概念

### 双作用域模型

系统支持两个独立的数据作用域，结构完全对称：

| 作用域      | 存储路径            | 用途                         |
| ----------- | ------------------- | ---------------------------- |
| **User**    | `~/.paper-manager/` | 个人全局资源，跨项目复用     |
| **Project** | `./.paper-manager/` | 项目专属资源，可纳入版本控制 |

两者使用相同的数据库 schema 和目录结构，运行时通过优先级规则合并：

- **配置读取**：Project 配置覆盖 User 配置
- **知识库查询**：优先查 Project DB，找不到时回退到 User DB

### 知识库 (Knowledge Base)

知识库是文献的组织容器，绑定一个嵌入模型配置。每个知识库拥有独立的向量存储目录，用于语义搜索。

### 文献 (Literature)

文献是系统的核心实体，包含：

- 论文元数据（标题、作者、摘要、关键词等）
- 关联的 PDF 文件（以文献 ID 命名存储）
- 向量化后的文本块（存储在所属知识库的向量存储中）
- 自由格式的键值对笔记

## 技术栈

| 组件       | 技术选型                          | 说明                             |
| ---------- | --------------------------------- | -------------------------------- |
| CLI 框架   | commander                         | 命令行解析与子命令路由           |
| 类型验证   | zod                               | Schema 定义 + 运行时校验         |
| 关系数据库 | better-sqlite3                    | 元数据存储，WAL 模式             |
| 向量数据库 | faiss-node + LangChain FaissStore | 语义搜索，本地文件持久化         |
| PDF 解析   | @langchain/community PDFLoader    | 按页提取文本内容                 |
| AI 嵌入    | Vercel AI SDK (@ai-sdk/openai)    | 文本向量化                       |
| 运行时     | Node.js >= 24                     | ES2024 目标编译                  |
| 包管理器   | pnpm                              | 通过 packageManager 字段锁定版本 |

## 目录结构

### 源码结构

```
src/
├── index.ts                # CLI 入口，注册子命令
├── types/index.ts          # Zod Schema 定义与 TypeScript 类型导出
├── config/index.ts         # 配置层级管理（读取、合并、校验）
├── db/
│   ├── index.ts            # SQLite 连接管理（单例模式，懒初始化）
│   ├── schema.ts           # 建表语句（knowledge_bases, literatures）
│   ├── operations/         # 通用数据库操作（接收 db 实例参数）
│   │   ├── knowledge-bases.ts
│   │   └── literatures.ts
│   ├── user/               # User 作用域操作（绑定 User DB）
│   │   ├── knowledge-bases.ts
│   │   └── literatures.ts
│   └── project/            # Project 作用域操作（绑定 Project DB）
│       ├── knowledge-bases.ts
│       └── literatures.ts
├── ai/
│   ├── provider.ts         # 创建 OpenAI embedding model 实例
│   ├── embed.ts            # 文本嵌入函数（单条 / 批量）
│   └── index.ts            # 模块导出
├── vector-store/
│   ├── embeddings.ts       # AiSdkEmbeddings：AI SDK → LangChain 适配器
│   └── index.ts            # Faiss 向量存储操作（创建、加载、查询）
├── pdf/
│   └── extractor.ts        # PDF 文本提取
└── commands/
    ├── config.ts           # paper config 子命令
    ├── knowledge-base.ts   # paper kb 子命令
    └── literature.ts       # paper lit 子命令
```

### 数据目录结构

User 和 Project 作用域的数据目录结构相同：

```
<scope-dir>/                    # ~/.paper-manager/ 或 ./.paper-manager/
├── config.json                 # 配置文件
├── papers.db                   # SQLite 数据库
├── pdfs/                       # PDF 文件存储
│   └── <literature-id>.pdf
└── vector-stores/              # 向量存储
    └── <knowledge-base-id>/    # 每个知识库独立目录
```

## 数据模型

### ER 关系

```
Config (JSON)
  └── embeddingModels: Record<id, EmbeddingModelConfig>
        ↑ embeddingModelId
KnowledgeBase ──1:N──→ Literature
                         └── notes: Record<key, value>
```

### 数据库 Schema

两张表，User DB 和 Project DB 使用相同结构：

- **knowledge_bases**：知识库元数据（id, name, description, embedding_model_id, 时间戳）
- **literatures**：文献元数据（id, title, author, abstract, keywords, notes, knowledge_base_id, 时间戳）
  - `keywords` 以 JSON 数组存储
  - `notes` 以 JSON 对象存储
  - `knowledge_base_id` 外键，`ON DELETE SET NULL`

## 关键流程

### 添加文献 (`paper lit add`)

```
PDF 文件
  ↓ PDFLoader（按页拆分）
Document[]
  ↓ RecursiveCharacterTextSplitter（1000 字符块，200 重叠）
切片 Document[]
  ↓ 创建文献记录 → SQLite
  ↓ 复制 PDF → pdfs/<lit-id>.pdf
  ↓ OpenAI Embedding API
  ↓ FaissStore（创建或追加）
向量存储 → vector-stores/<kb-id>/
```

### 语义查询 (`paper kb query`)

```
查询文本
  ↓ 定位知识库（Project 优先 → User 回退）
  ↓ 加载模型配置
  ↓ OpenAI Embedding API
  ↓ FaissStore.similaritySearch(query, k)
Top-K 相似文档
```

### 删除知识库 (`paper kb remove`)

级联清理顺序：

1. 查询知识库下所有文献
2. 删除关联 PDF 文件
3. 删除文献数据库记录
4. 删除向量存储目录
5. 删除知识库数据库记录

## CLI 命令概览

```
paper
├── config                      # 配置管理
│   ├── get <key> [--user]
│   ├── set <key> <value> [--user]
│   ├── remove <key> [--user]
│   └── list [--user]
├── kb                          # 知识库管理
│   ├── create <name> -d <desc> [-e <model-id>] [--user]
│   ├── list [--user | --all]
│   ├── remove <id>
│   └── query <id> <query-text> [-k <top-k>]
└── lit                         # 文献管理
    ├── add <kb-id> <pdf-path> [-t <title>]
    ├── list <kb-id>
    ├── show <kb-id> <lit-id>
    ├── update <kb-id> <lit-id> [--title ...] [--author ...] ...
    ├── remove <kb-id> <lit-id>
    └── note                    # 笔记管理
        ├── list <lit-id>
        ├── set <lit-id> <key> <value>
        └── remove <lit-id> <key>
```

## 设计模式

| 模式         | 应用位置                                      | 说明                                              |
| ------------ | --------------------------------------------- | ------------------------------------------------- |
| 单例         | `db/index.ts`                                 | 数据库连接懒初始化，进程内共享                    |
| 适配器       | `vector-store/embeddings.ts`                  | 将 Vercel AI SDK 桥接到 LangChain Embeddings 接口 |
| 工厂         | `ai/provider.ts`                              | 根据配置创建 embedding model 实例                 |
| 分层         | `db/operations/` → `db/user/` / `db/project/` | 通用操作与作用域绑定分离                          |
| Schema-first | `types/index.ts`                              | Zod schema 同时作为类型定义和运行时校验           |

## 配置示例

```jsonc
{
  "embeddingModels": {
    "openai-small": {
      "provider": "openai",
      "model": "text-embedding-3-small",
      "apiKey": "sk-...",
      "dimensions": 1536,
    },
  },
  "defaultEmbeddingModelId": "openai-small",
}
```

支持自定义 `baseUrl` 以接入 OpenAI 兼容 API。
