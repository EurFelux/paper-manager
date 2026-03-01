# Agent Guidelines

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

A paper management system. See `docs/architecture.md` for details.

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
