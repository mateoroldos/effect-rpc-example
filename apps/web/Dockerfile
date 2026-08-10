# syntax=docker/dockerfile:1
# Build context = repo root so `turbo prune` can isolate this app + its deps.
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Prune the monorepo to @effect-template/web + deps.
FROM base AS prune
COPY . .
RUN bunx turbo@2.10.7 prune @effect-template/web --docker

# Build needs devDeps (vite, svelte, adapter-node).
# --ignore-scripts skips the root `prepare` (dev-only tsgo patch).
FROM base AS build
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .
# turbo prune omits root config; the web tsconfig chain extends this.
COPY tsconfig.base.json ./tsconfig.base.json
# SvelteKit validates required private env at build; placeholders satisfy it
# without baking in — Railway supplies real values at runtime.
ENV API_URL=http://build-placeholder \
    APP_ENV=production
RUN bun run --cwd apps/web build

# Slim runtime: production deps + adapter-node output only.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts --production
# Workspace deps are consumed as TS source via node_modules symlinks.
COPY --from=prune /app/out/full/packages ./packages
COPY --from=build /app/apps/web/build ./apps/web/build
# oven/bun ships a non-root `bun` user.
USER bun
# adapter-node output; reads PORT (Railway sets it), listens on 0.0.0.0.
CMD ["bun", "apps/web/build/index.js"]
