# my-ts-starter

A minimal TypeScript project template with modern tooling powered by the [oxc](https://oxc.rs/) ecosystem.

## Features

- **TypeScript** — Type-safe development with `tsc`
- **oxlint** — Fast linter with type-aware rules (via `oxlint-tsgolint`)
- **oxfmt** — Fast formatter

## Getting Started

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm fmt
```

## Available Scripts

| Script           | Description                      |
| ---------------- | -------------------------------- |
| `pnpm typecheck` | Run TypeScript type checking     |
| `pnpm lint`      | Lint with oxlint (type-aware)    |
| `pnpm lint:fix`  | Lint and auto-fix                |
| `pnpm fmt`       | Format with oxfmt                |
| `pnpm fmt:check` | Check formatting without writing |

## License

[MIT](LICENSE)
