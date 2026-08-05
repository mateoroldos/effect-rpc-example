# Bun container for the Effect API server. Build context = repo root (the whole
# monorepo), so `turbo prune` can isolate this app plus its workspace deps.
# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Prune the monorepo down to @effect-template/server and its dependencies.
FROM base AS prune
COPY . .
RUN bunx turbo@2 prune @effect-template/server --docker

# Install only the pruned dependency set. --ignore-scripts skips the root
# `prepare` (Effect tsgo patch), which is dev-only tooling.
FROM base AS install
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .

FROM install AS runtime
ENV NODE_ENV=production
# Bun runs the TypeScript entry directly; the server reads PORT (Railway sets it).
CMD ["bun", "run", "apps/server/src/index.ts"]
