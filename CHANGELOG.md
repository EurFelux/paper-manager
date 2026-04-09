# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.10.4] - 2026-04-10

### Added

- Auto-detect opendataloader hybrid backend at `localhost:5002` and enable `docling-fast` mode for improved PDF extraction quality
- `dep check` now shows hybrid backend availability status

## [0.10.3] - 2026-04-10

### Fixed

- Recursively collect images from opendataloader output subdirectories (e.g., `<pdf>_images/`); the previous fix only scanned the top-level output directory and missed all images

## [0.10.2] - 2026-04-10

### Fixed

- Preserve images extracted by opendataloader during PDF-to-Markdown conversion; previously all image links in the generated Markdown were broken because the temp directory was deleted before images could be saved

## [0.10.1] - 2026-04-10

### Fixed

- Make `dep check` argument optional so running `paper dep check` without arguments checks all dependencies

## [0.10.0] - 2026-04-09

### Added

- `dep check` command for checking external dependency availability (e.g., `paper dep check opendataloader`)
- `lit convert` command for converting existing literature PDFs to Markdown via opendataloader-pdf
- Automatic PDF-to-Markdown conversion via opendataloader-pdf during `lit add` (requires Java 11+, silently skipped when unavailable)
- `lit list` and `lit show` now display associated files (PDF, Markdown, etc.) for each literature

## [0.9.0] - 2026-04-09

### Added

- `--json` flag for read commands: `kb list`, `kb query`, `lit list`, `lit search`, `lit show`, `lit note list`

### Changed

- Replace LangChain ecosystem with direct `faiss-node` usage and built-in text splitter, removing 105 packages and cutting production install size from 273MB to 134MB
- Replace `pdf-parse` with `unpdf` (same PDF.js engine, 1.8MB vs 57MB)

## [0.8.1] - 2026-04-08

### Fixed

- Republish with fresh build so the `lit search` command is included in the shipped `dist/`

## [0.8.0] - 2026-04-08

### Added

- `lit search` command for searching literatures in a knowledge base by metadata (title, author, keyword, DOI)
- Index on `literatures.knowledge_base_id` for faster KB-scoped lookups (auto-migrated)

## [0.7.0] - 2026-03-15

### Added

- `util pdf-meta` command for extracting metadata from PDF files

## [0.6.0] - 2026-03-15

### Added

- `doi` field for literature metadata
- `util doi2bib` command for converting DOI to BibTeX citation
- Auto-extract metadata (title, author, subject, keywords, DOI, dates) from PDF when adding literature

### Changed

- Refactor DB layer from raw SQL to Drizzle ORM for type-safe queries

## [0.5.0] - 2026-03-12

### Added

- `kb update` command for updating knowledge base metadata

## [0.4.2] - 2026-03-12

### Added

- Count summary to all list subcommands

## [0.4.1] - 2026-03-12

### Changed

- Extract migration into lifecycle startup hook

## [0.4.0] - 2026-03-12

### Added

- Multi-format file input support for `paper lit add` (not just PDF)
- Vitest framework and unit tests for schemas, DB converters, config I/O, scope init, and embedding batch logic
- Integration tests for DB operations (knowledge bases and literatures)

### Changed

- Move PDF extractor to new extractor module

## [0.3.1] - 2026-03-12

### Fixed

- Check for both FAISS index files before loading store

## [0.3.0] - 2026-03-12

### Added

- Batch size configuration for embedding models
- Pre-commit hooks for linting and formatting

## [0.2.5] - 2026-03-12

### Fixed

- Replace LangChain PDFLoader with direct pdf-parse v2 API

## [0.2.4] - 2026-03-12

### Fixed

- Add missing pdf-parse dependency for PDF text extraction

## [0.2.3] - 2026-03-12

### Added

- `$schema` field to config JSON schema
- Format generated schema JSON with oxfmt

### Fixed

- Formatting issues

## [0.2.2] - 2026-03-12

### Added

- JSON schema for config validation
- Release script for automated version publishing
- Embedding dimensions now optional for OpenAI models

## [0.2.1] - 2026-03-12

### Added

- CLI output formatting improvements with chalk dependency
- Configuration reference documentation
- `import/no-cycle` lint rule

### Fixed

- Read CLI version from package.json

## [0.2.0] - 2026-03-12

### Added

- `config init` command for scope initialization

## [0.1.1] - 2026-03-12

### Added

- npm version and license badges to README
- Homepage and repository fields to package.json

## [0.1.0] - 2026-03-12

### Added

- Full paper management CLI implementation
- Dual-scope model (user scope and project scope)
- Knowledge base management (`kb` commands)
- Literature management (`lit` commands) with PDF ingestion
- Semantic search via FAISS vector store
- Embedding model configuration
- SQLite metadata storage
- Import sorting and type import lint rules

[0.10.4]: https://github.com/EurFelux/paper-manager/compare/v0.10.3...v0.10.4
[0.10.3]: https://github.com/EurFelux/paper-manager/compare/v0.10.2...v0.10.3
[0.10.2]: https://github.com/EurFelux/paper-manager/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/EurFelux/paper-manager/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/EurFelux/paper-manager/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/EurFelux/paper-manager/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/EurFelux/paper-manager/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/EurFelux/paper-manager/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/EurFelux/paper-manager/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/EurFelux/paper-manager/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/EurFelux/paper-manager/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/EurFelux/paper-manager/compare/0.4.1...v0.4.2
[0.4.1]: https://github.com/EurFelux/paper-manager/compare/v0.4.0...0.4.1
[0.4.0]: https://github.com/EurFelux/paper-manager/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/EurFelux/paper-manager/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/EurFelux/paper-manager/compare/v0.2.5...v0.3.0
[0.2.5]: https://github.com/EurFelux/paper-manager/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/EurFelux/paper-manager/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/EurFelux/paper-manager/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/EurFelux/paper-manager/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/EurFelux/paper-manager/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/EurFelux/paper-manager/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/EurFelux/paper-manager/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/EurFelux/paper-manager/releases/tag/v0.1.0
