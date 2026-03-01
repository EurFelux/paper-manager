# Agent Guidelines

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Paper Manager is a CLI tool (`paper` command) for managing academic papers with semantic search. Local-first design: SQLite for metadata, FAISS for vector search, filesystem for PDFs. No cloud dependencies.

## Commands

- `pnpm typecheck` — Type check with `tsc --noEmit`
- `pnpm lint` — Lint with oxlint (type-aware mode)
- `pnpm lint:fix` — Auto-fix lint issues
- `pnpm fmt` — Format code with oxfmt
- `pnpm fmt:check` — Check formatting without modifying files
- `pnpm build` — Build with `tsc` (outputs to `dist`)

## Tooling

- **Linter**: oxlint with `oxlint-tsgolint` plugin (not ESLint). Config in `.oxlintrc.json`.
- **Formatter**: oxfmt (not Prettier). Config in `.oxfmtrc.json`.
- **Type checking**: TypeScript 5.9 via `tsc --noEmit`. Config in `tsconfig.json`.
- **Package manager**: pnpm (pinned via `packageManager` field). Always use `pnpm`, never `npm` or `yarn`.

## Coding Standards

- **Avoid `any` and `as`**: Do not use `any` type or `as` type assertions. Use proper type annotations and type guards instead.

## Architecture

### Dual-Scope Model

The system operates in two parallel scopes with identical schemas and directory layouts:

- **User scope** (`~/.paper-manager/`): Global personal resources, shared across projects.
- **Project scope** (`./.paper-manager/`): Project-specific resources, version-controllable.

Merge rules: config reads merge with project overriding user (`{ ...userConfig, ...projectConfig }`). Knowledge base lookups check project DB first, then fall back to user DB.

### Layer Structure

```
CLI Commands (src/commands/)        ← commander subcommands
    ↓
Business Logic                      ← config/, db/, vector-store/, pdf/, ai/
    ↓
Storage: SQLite + FAISS + JSON + filesystem
```

### Key Design Patterns

- **Schema-first types**: `src/types/index.ts` defines Zod schemas as the single source of truth. TypeScript types are inferred from Zod (`z.infer<>`). Always add/modify types here first.
- **DB scope layering**: `db/operations/` has generic CRUD functions that accept a `db` instance parameter. `db/user/` and `db/project/` re-export these bound to their respective singleton connections. When adding DB operations, write the generic version in `operations/` and create scope wrappers.
- **Singleton DB connections**: `db/index.ts` lazily initializes and caches user/project SQLite connections.
- **Adapter pattern**: `vector-store/embeddings.ts` (`AiSdkEmbeddings`) bridges Vercel AI SDK to LangChain's `Embeddings` interface. FAISS operations go through LangChain's `FaissStore`.
- **Factory pattern**: `ai/provider.ts` creates embedding model instances from config objects.

### Data Model

Two tables (`knowledge_bases`, `literatures`) with identical schema in both user and project DBs. `keywords` stored as JSON array, `notes` as JSON object. FK: `literatures.knowledge_base_id → knowledge_bases.id` with `ON DELETE SET NULL`.

### Data Directory Layout (per scope)

```
<scope-dir>/
├── config.json          # Embedding model configs + default model ID
├── papers.db            # SQLite database
├── pdfs/<lit-id>.pdf    # Stored PDFs
└── vector-stores/<kb-id>/  # FAISS index per knowledge base
```

### Critical Flows

**Initializing scope** (`paper config init`): Determine base dir → create base dir → write empty `config.json` → open + init SQLite → create `pdfs/` and `vector-stores/` dirs. Idempotent: skips existing items. Logic in `src/config/init.ts` (separate file to avoid circular dep with `db/index.ts`).

**Adding literature** (`paper lit add`): PDF → page-split → chunk (1000 chars, 200 overlap) → create SQLite record → copy PDF → embed chunks → upsert FAISS store.

**Semantic query** (`paper kb query`): Locate KB (project-first) → load embedding config → embed query → FAISS similaritySearch → return top-k.

**Deleting KB** (`paper kb remove`): Cascading cleanup: query all literatures → delete PDFs → delete literature records → delete vector store dir → delete KB record.
