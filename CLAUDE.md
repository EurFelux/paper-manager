# Agent Guidelines

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

A minimal TypeScript project starter template with linting and formatting tooling. Uses pnpm as package manager.

## Commands

- `pnpm run typecheck` — Type check with `tsc --noEmit`
- `pnpm run lint` — Lint with oxlint (type-aware mode)
- `pnpm run lint:fix` — Auto-fix lint issues
- `pnpm run fmt` — Format code with oxfmt
- `pnpm run fmt:check` — Check formatting without modifying files

## Tooling

- **Linter**: oxlint with `oxlint-tsgolint` plugin (not ESLint). Config in `.oxlintrc.json`.
- **Formatter**: oxfmt (not Prettier). Config in `.oxfmtrc.json`.
- **Type checking**: TypeScript 5.9 via `tsc --noEmit`. No `tsconfig.json` exists yet — create one when adding source files.
- **Package manager**: pnpm (pinned via `packageManager` field). Always use `pnpm`, never `npm` or `yarn`.
