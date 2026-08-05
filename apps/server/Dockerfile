# syntax=docker/dockerfile:1
# Build context = repo root so `turbo prune` can isolate this app + its deps.
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Prune the monorepo to @effect-template/server + deps.
FROM base AS prune
COPY . .
RUN bunx turbo@2 prune @effect-template/server --docker

# Runs TS directly (no build) → --production drops devDeps.
# --ignore-scripts skips the root `prepare` (dev-only tsgo patch).
FROM base AS install
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production
COPY --from=prune /app/out/full/ .

FROM install AS runtime
ENV NODE_ENV=production
# oven/bun ships a non-root `bun` user.
USER bun
# Reads PORT (Railway sets it).
CMD ["bun", "run", "apps/server/src/index.ts"]
