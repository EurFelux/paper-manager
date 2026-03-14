# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
