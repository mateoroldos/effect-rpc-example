# effect-template

Minimal Effect v4 monorepo. First iteration: scaffold only, no functionality.

## Structure

```txt
packages/core     @effect-template/core   — empty domain/application package
apps/server       @effect-template/server — empty Effect entrypoint
```

## Stack

- **Runtime / package manager:** Bun
- **Monorepo:** Bun workspaces + Turborepo
- **Language:** TypeScript (strict) + Effect v4 (beta)
- **Lint / format:** Ultracite (Biome preset)

## Commands

```bash
bun install          # install workspace deps
bun run dev          # turbo dev (runs the server in watch mode)
bun run check-types  # tsc across the workspace
bun run check        # ultracite (biome) lint + format check
bun run fix          # ultracite autofix
```
