# paper-manager

[![npm version](https://img.shields.io/npm/v/paper-manager)](https://www.npmjs.com/package/paper-manager)
[![license](https://img.shields.io/npm/l/paper-manager)](https://github.com/EurFelux/paper-manager/blob/main/LICENSE)

A CLI tool for managing academic papers with knowledge base and vector search support.

## Installation

```bash
npm install -g paper-manager
```

```bash
pnpm install -g paper-manager
```

```bash
bun install -g paper-manager
```

## Quick Start

```bash
# Initialize data directory
paper config init --user

# Configure an embedding model
paper config set embeddingModels '{"openai-small":{"provider":"openai","model":"text-embedding-3-small","apiKey":"sk-...","dimensions":1536}}' --user
paper config set defaultEmbeddingModelId '"openai-small"' --user

# Create a knowledge base
paper kb create my-papers -d "My research papers"

# Add a paper (supports PDF, TXT, MD, TEX, etc.)
paper lit add <knowledge-base-id> ./paper.pdf

# Search across papers
paper kb query <knowledge-base-id> "attention mechanism"
```

## Commands

### Configuration (`paper config`)

```bash
paper config init [--user]               # Initialize data directory structure
paper config get <key> [--user]          # Get a config value
paper config set <key> <value> [--user]  # Set a config value
paper config remove <key> [--user]       # Remove a config key
paper config list [--user]               # List all config
```

### Knowledge Base (`paper kb`)

```bash
paper kb create <name> -d <desc> [-e <model-id>] [--user]  # Create a knowledge base
paper kb list [--all | --user]        # List knowledge bases
paper kb update <id> [-n <name>] [-d <desc>]  # Update knowledge base metadata
paper kb remove <id>                  # Remove a knowledge base
paper kb query <id> <query-text>      # Query a knowledge base
```

### Literature (`paper lit`)

```bash
paper lit add <kb-id> <file-path>     # Add a literature (PDF, TXT, MD, TEX, etc.)
paper lit remove <kb-id> <id>         # Remove a literature
paper lit update <kb-id> <id> [opts]  # Update literature metadata
paper lit list <kb-id>                # List literatures
paper lit show <kb-id> <id>           # Show literature details
paper lit note list <lit-id>          # List notes
paper lit note set <lit-id> <k> <v>   # Set a note
paper lit note remove <lit-id> <key>  # Remove a note
```

### Utilities (`paper util`)

```bash
paper util doi2bib <doi>             # Convert a DOI to BibTeX citation
```

## Configuration

See [Configuration Reference](docs/configuration.md) for all available config fields and detailed usage.

## Data Storage

- **User data**: `~/.paper-manager/` — global config, personal knowledge bases
- **Project data**: `./.paper-manager/` — project-specific knowledge bases

Project config takes priority over user config.

## Agent Skill

Install as a skill to let coding agent manage your papers (Powered by [vercel-labs/skills](https://github.com/vercel-labs/skills)):

```bash
npx skills add https://github.com/EurFelux/paper-manager
```

```bash
pnpx skills add https://github.com/EurFelux/paper-manager
```

```bash
bunx skills add https://github.com/EurFelux/paper-manager
```

## License

[MIT](LICENSE)
