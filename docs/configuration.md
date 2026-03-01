# Configuration Reference

Paper Manager uses JSON configuration files (`config.json`) stored in the data directory of each scope.

## Scopes

Configuration is split into two scopes. Project-scope values override user-scope values for the same key.

| Scope   | Path                           | Description                                        |
| ------- | ------------------------------ | -------------------------------------------------- |
| user    | `~/.paper-manager/config.json` | Global config shared across all projects           |
| project | `./.paper-manager/config.json` | Project-specific config, can be version-controlled |

## Fields

### `embeddingModels`

- **Type**: `Record<string, EmbeddingModelConfig>`
- **Default**: `{}`

A map of embedding model configurations. Each key is a user-defined model ID, and the value is a model config object with the following fields:

| Field        | Type       | Required | Description                                                                              |
| ------------ | ---------- | -------- | ---------------------------------------------------------------------------------------- |
| `provider`   | `"openai"` | Yes      | Model provider. Currently only `"openai"` is supported (any OpenAI-compatible API works) |
| `model`      | `string`   | Yes      | Model name, e.g. `"text-embedding-3-small"`                                              |
| `dimensions` | `number`   | Yes      | Vector dimensions (positive integer). Must match the model's actual output dimensions    |
| `apiKey`     | `string`   | Yes      | API key                                                                                  |
| `baseUrl`    | `string`   | No       | Custom API endpoint URL. Use this for OpenAI-compatible third-party services             |

### `defaultEmbeddingModelId`

- **Type**: `string`
- **Required**: No

The default embedding model ID. Must reference a key defined in `embeddingModels`. When creating a knowledge base without the `-e` flag, this model is used.

## Example

```json
{
  "embeddingModels": {
    "openai-small": {
      "provider": "openai",
      "model": "text-embedding-3-small",
      "dimensions": 1536,
      "apiKey": "sk-..."
    },
    "openai-large": {
      "provider": "openai",
      "model": "text-embedding-3-large",
      "dimensions": 3072,
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    }
  },
  "defaultEmbeddingModelId": "openai-small"
}
```

## CLI Commands

```bash
# Initialize data directory and config file
paper config init              # project scope
paper config init --user       # user scope

# Read and write config values
paper config set <key> <value> [--user]
paper config get <key> [--user]
paper config remove <key> [--user]
paper config list [--user]
```

Example — setting up an embedding model:

```bash
paper config set embeddingModels '{"openai-small":{"provider":"openai","model":"text-embedding-3-small","dimensions":1536,"apiKey":"sk-..."}}'

paper config set defaultEmbeddingModelId '"openai-small"'
```
