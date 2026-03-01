# paper-manager

[![npm version](https://img.shields.io/npm/v/paper-manager)](https://www.npmjs.com/package/paper-manager)
[![license](https://img.shields.io/npm/l/paper-manager)](https://github.com/EurFelux/paper-manager/blob/main/LICENSE)

A CLI tool for managing academic papers with knowledge base and vector search support.

## Installation

```bash
npm install -g paper-manager
```

## Quick Start

```bash
# Configure an embedding model
paper config set embeddingModels '{"openai-small":{"provider":"openai","model":"text-embedding-3-small","apiKey":"sk-...","dimensions":1536}}' --user
paper config set defaultEmbeddingModelId '"openai-small"' --user

# Create a knowledge base
paper kb create my-papers -d "My research papers"

# Add a paper
paper lit add <knowledge-base-id> ./paper.pdf

# Search across papers
paper kb query <knowledge-base-id> "attention mechanism"
```

## Commands

### Configuration (`paper config`)

```bash
paper config get <key> [--user]       # Get a config value
paper config set <key> <value> [--user]  # Set a config value
paper config remove <key> [--user]    # Remove a config key
paper config list [--user]            # List all config
```

### Knowledge Base (`paper kb`)

```bash
paper kb create <name> -d <desc> [-e <model-id>] [--user]  # Create a knowledge base
paper kb list [--all | --user]        # List knowledge bases
paper kb remove <id>                  # Remove a knowledge base
paper kb query <id> <query-text>      # Query a knowledge base
```

### Literature (`paper lit`)

```bash
paper lit add <kb-id> <pdf-path>      # Add a literature from PDF
paper lit remove <kb-id> <id>         # Remove a literature
paper lit update <kb-id> <id> [opts]  # Update literature metadata
paper lit list <kb-id>                # List literatures
paper lit show <kb-id> <id>           # Show literature details
paper lit note list <lit-id>          # List notes
paper lit note set <lit-id> <k> <v>   # Set a note
paper lit note remove <lit-id> <key>  # Remove a note
```

## Data Storage

- **User data**: `~/.paper-manager/` — global config, personal knowledge bases
- **Project data**: `./.paper-manager/` — project-specific knowledge bases

Project config takes priority over user config.

## License

[MIT](LICENSE)
