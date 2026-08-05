# Container for the SvelteKit web app (adapter-node). Build context = repo root
# so `turbo prune` can isolate this app plus its workspace deps.
# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Prune the monorepo down to @effect-template/web and its dependencies.
FROM base AS prune
COPY . .
RUN bunx turbo@2 prune @effect-template/web --docker

# Install the pruned set (build needs devDeps: vite, svelte, adapter-node).
# --ignore-scripts skips the root `prepare` (Effect tsgo patch), dev-only tooling.
FROM base AS build
COPY --from=prune /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .
# turbo prune omits root config files; the web tsconfig chain extends this one.
COPY tsconfig.base.json ./tsconfig.base.json
# SvelteKit validates these at build. They are private (server-side, read at
# runtime), so build-time placeholders satisfy validation without being baked
# in — Railway supplies the real values at runtime. This repo's turbo.json has
# no `build` task, so run the app's build script directly.
ENV API_URL=http://build-placeholder \
    APP_ENV=production \
    OTEL_SERVICE_NAME=effect-template-web
RUN bun run --cwd apps/web build
ENV NODE_ENV=production
# adapter-node emits apps/web/build; Bun runs it with node_modules present for
# the externalized runtime deps. Railway sets PORT (adapter-node reads it).
CMD ["bun", "apps/web/build/index.js"]
