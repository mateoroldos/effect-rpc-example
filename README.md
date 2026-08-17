# effect-template

**A production-grade starting point for [Effect](https://effect.website) v4 services.**
Typed RPC over HTTP, PostgreSQL persistence, ports-and-adapters architecture, and
tests through real seams.

## Why this template

| | |
|---|---|
| **Correct by construction** | Branded, parsed domain types make illegal states unrepresentable. |
| **Ports & adapters** | Pure domain, application services depending on interfaces, technology isolated at the edges. |
| **Errors as values** | Typed, tagged failures projected at every boundary — infrastructure detail never leaks. |
| **Composable by Layer** | One composition root; everything else stays dependency-agnostic and testable. |
| **Tested through real seams** | In-memory, real-database, contract, and end-to-end tiers. No module mocks. |
| **Enforced, not documented** | The compiler rejects globals, floating effects, and leaked dependencies. |

## Architecture

Dependencies point one way; `apps/server` is the only place concrete Layers meet.

Arrows read "depends on". `domain` is the pure sink everyone points at.

```txt
core → domain          rpc → domain          database → core, domain
auth-better → core, domain                 web → rpc, domain
server → auth-better, core, rpc, database
```

| Package | Responsibility |
|---|---|
| `packages/domain` | Pure shared vocabulary — branded domain types with no dependencies. |
| `packages/auth-better` | Better Auth adapter for identity and Organization authorization. |
| `packages/core` | Application services and the ports they depend on. |
| `packages/database` | PostgreSQL lifecycle and adapters implementing core ports. |
| `packages/rpc` | Transport-independent RPC contracts; handlers live in `apps/server`. |
| `apps/server` | Composition root — provides every Layer and launches the API process. |
| `apps/web` | SvelteKit UI — remote functions call the typed Agents RPC server-side. |

The composition root wires the graph in one place, and Effect memoizes shared
infrastructure (database pool, config, clock) so it is built exactly once:

```txt
appLayer
├─ rpcLayer                     HTTP transport + registered handlers
│  └─ agents handlers ── AgentDirectory ── AgentStore (Postgres adapter)
├─ databaseLayer                PostgreSQL, migrated, from DATABASE_URL
├─ crypto / serialization
└─ HTTP server (Portless-assigned port)

Svelte page (Portless-assigned port)
└─ remote function ── Effect RPC client ── HTTP /rpc ── appLayer
```

## Quick start

Install dependencies, create explicit workspace configuration, trust Portless's
local certificate, then start PostgreSQL and the applications separately:

```bash
bun install
bun run env:setup             # seed .env beside every .env.example (create-if-missing)
bunx --no-install portless trust
bun run db:setup              # start PostgreSQL and run migrations
bun run dev
```

### Parallel workspaces

A git worktree, jj workspace, or extra clone derives its identity from its
**directory name** — no config. `bun run dev` there gets isolated URLs, database,
and telemetry:

```text
Web  https://<dir>.effect-template.localhost
API  https://<dir>.api.effect-template.localhost
```

Run as many at once as you like — no config. All workspaces share one local
Postgres; each gets its own database inside it (`eff_<id>`), created on demand by
`bun run db:setup`. Override the derived name with `DEV_INSTANCE=<name> bun run dev`.
Postgres is independent of the apps: `Ctrl+C` stops the apps; `bun run db:down`
stops the shared Postgres (data survives), `bun run db:destroy` drops **this**
workspace's database (others untouched), `bun run db:nuke` removes the shared
server and all data. Each app also has a `dev:app` script to run it directly,
without portless.

## Environment variables

Split by consumer ([Turborepo's
recommendation](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)):
each app owns its runtime `.env`. There is no root `.env` — orchestration is
derived from the workspace id.

| File | Owns | Loaded by |
| --- | --- | --- |
| `apps/server/.env` | `APP_ENV`, auth secrets, email, `OTEL_*` | Bun (from the app's cwd) |
| `apps/web/.env` | `APP_ENV`, `OTEL_*` | Vite / SvelteKit |

Runtime locations are **derived in Portless development, explicit in production**.
The server derives `DATABASE_URL`, `BETTER_AUTH_URL`, and `WEB_URL`; the web app
derives `API_URL`. All use the workspace id, which defaults to the directory
name; override it by exporting `DEV_INSTANCE`. Direct app development uses
localhost URLs and requires `DATABASE_URL`. Production requires all four values.
Deploy credentials are separate — see [`alchemy.env.example`](alchemy.env.example).

Telemetry has one switch per app: `OTEL_EXPORTER_OTLP_ENDPOINT` set → export on,
unset → console only (default). Locally, run `bun run telemetry:up` and uncomment
the endpoint in the app's `.env`; prod sets it for Axiom. The service name is
derived in code (`${DEV_INSTANCE}-api`/`-web`), not an env var.

## Observability

The API and web server export OTLP logs, metrics, and traces when each app's
`.env` sets `OTEL_EXPORTER_OTLP_ENDPOINT`. Locally, `bun run telemetry:up` starts
the Maple collector at `http://localhost:4318` — point each app there. The web
server's RPC client spans propagate trace context to the API, producing one
cross-service trace rooted at `AgentsRemote.*`.

For the complete local profile, [install Maple](https://maple.dev/docs/local-mode/),
then run:

```bash
bun run dev:full
```

This starts or reuses one machine-level Maple process and configures the apps to
export telemetry to it. Plain `bun run dev` does not require Maple.
`bun run telemetry:up` starts or reuses Maple independently. Maple persists
machine-level data under its default `~/.maple/data` directory.

### Production telemetry (Axiom)

`bun run infra:deploy` provisions an [Axiom](https://axiom.co) dataset and a
scoped ingest token (see [Infrastructure](#infrastructure)). Point the
deployment's OTLP exporter at Axiom — one dataset receives logs, traces, and
metrics, routed by the `X-Axiom-Dataset` header:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.axiom.co
OTEL_EXPORTER_OTLP_HEADERS_JSON={"Authorization":"Bearer <ingest-token>","X-Axiom-Dataset":"effect-template"}
```

The exporter is provider-agnostic, so any OTLP backend (Better Stack, Grafana,
a self-hosted collector) works with the same two variables. Keep the token in
the deployment's secret store. Deployments must set `APP_ENV` and should inject
`OTEL_SERVICE_VERSION` from release metadata; the service name is derived in code.

| Variable | Default |
|---|---|
| `APP_ENV` | required |
| `LOG_LEVEL` | `Debug` locally, `Info` in production |
| `OTEL_SERVICE_NAME` | derived in code |
| `OTEL_SERVICE_VERSION` | absent |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | absent (export disabled) |
| `OTEL_EXPORTER_OTLP_HEADERS_JSON` | absent (JSON object of exporter headers) |

## GitHub automation

After creating a repository from this template, configure the repository settings that workflows cannot store in Git:

1. Protect `main` and require the always-on CI, Commitlint, and PR Title checks. Do not require the path-filtered Zizmor workflow globally.
2. Allow squash and rebase merges. Commitlint validates commits retained by a rebase; PR Title validates the commit created by a squash.
3. Create a protected `production` environment with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEON_API_KEY`, and `AXIOM_TOKEN`. Add `APP_DOMAIN` as an optional environment variable.
4. Install the Renovate GitHub App. Renovate updates Bun dependencies, the shared catalog, and digest-pinned GitHub Actions.

The labeler creates its configured labels on same-repository pull requests. Fork pull requests receive a read-only token, so the labeler skips them (a neutral check, never a failure). If you enable GitHub's merge queue, add the `merge_group` trigger to each required workflow before requiring the queue.

Infrastructure deployment runs after matching pushes to `main` and serializes all production changes. Keep direct pushes disabled so every automatic deployment has already passed protected pull-request checks. `harden-runner` starts in egress audit mode; review its observed endpoints before switching production deployment to an explicit block-mode allowlist.

## Infrastructure

Two planes. [Alchemy](https://alchemy.run) provisions the cloud primitives; the
apps deploy to [Railway](https://railway.com) natively from git. They meet at the
env vars Alchemy's outputs become — set once in Railway.

```txt
Alchemy (`bun run infra:deploy`)              Railway (git push + railway.json)
├─ Neon Postgres      → DATABASE_URL  ─┐
├─ Axiom dataset+token → OTEL_* ───────┤
├─ R2 bucket          → R2_* (later) ──┼─► server  (Bun, /health, pre-deploy migrate)
├─ Cloudflare email token → CF creds ──┤
└─ (state in Cloudflare DO SQLite)      └─► web    (SvelteKit adapter-node)
```

### Alchemy — `alchemy.run.ts`

One stack provisions Neon, Axiom, an (empty) R2 bucket, and a Cloudflare Email
Sending API token. State lives in a Cloudflare DO store, shared by local and CI;
`ALCHEMY_LOCAL_STATE=1` opts into throwaway local file state (`.alchemy/`) for
experiments that must not touch it. Deploy-time credentials (never seen by the running apps)
come from the environment — see [`alchemy.env.example`](alchemy.env.example):

```bash
cp alchemy.env.example .env.deploy   # fill in the tokens
set -a; source .env.deploy; set +a
bun run check-types                  # typechecks the stack (folded in)
bun run infra:deploy                 # provision (prints a safe summary)
```

Resource attributes are lazy — secrets never print. Retrieve each from its
provider console for the one-time paste into Railway (see the runbook).

### Railway — `apps/*/railway.json`

Each app has a `railway.json` + a `Dockerfile` that `turbo prune`s the monorepo
to just that app. In Railway, set each service's **root directory to the repo
root** and its **config path** to `apps/<app>/railway.json`; Railway builds on
push. The server runs its migration as a **pre-deploy command** and exposes
`GET /health` for the healthcheck.

### Deploy runbook (single prod, one-time)

1. `bun run infra:deploy` — provision Neon, Axiom, R2, email token.
2. **Onboard the email domain:** `wrangler email sending enable <domain>` (adds
   DNS records; the domain's DNS must be on Cloudflare).
3. **Collect secrets** from each console: Neon → `DATABASE_URL` (pooled); Axiom →
   ingest token; Cloudflare → the email API token value (shown once on create).
4. **Create two Railway services** (server, web) from the repo; set root dir +
   config path as above.
5. **Set Railway variables** — see [`apps/server/.env.example`](apps/server/.env.example)
   and [`apps/web/.env.example`](apps/web/.env.example) for the full inventory
   (`DATABASE_URL`, `OTEL_*` for Axiom, `CLOUDFLARE_ACCOUNT_ID`,
   `CLOUDFLARE_EMAIL_API_TOKEN`, `EMAIL_FROM_*`, `APP_ENV=production`).
6. **DNS** (optional custom domains): add each Railway service's domain in its
   settings, then create the CNAME it shows in Cloudflare (manual — the target
   only exists after the service does).
7. **Push** — Railway builds and deploys; the server migrates before serving.

## Add a feature

Follow the dependency arrows outward. Each step has a matching test tier.

1. **Domain** (`domain` if shared; else beside its port in `core`) — a Schema
   with branded, parsed values. → property test.
2. **Port** (`core`) — the narrowest interface the operation needs, beside the
   service that uses it.
3. **Service** (`core`) — sequence effects and policy through the port; return
   typed errors. → in-memory test.
4. **Adapter** (`database`) — implement the port against Postgres; translate
   technology errors. → real-database test.
5. **Contract** (`rpc`) **+ handler** (`apps/server`) — the RPC entry in `rpc`,
   and an inbound-adapter handler that projects application errors to safe
   transport errors. → contract test.
6. **Wire it** (`apps/server`) — provide the new Layers. → end-to-end test.

## Testing

Tests run through public interfaces against real seams — every double satisfies
the real interface, and no modules are mocked.

| Tier | Seam | Verifies |
|---|---|---|
| Unit | in-memory Layer | application-service policy |
| Integration | PGlite (embedded Postgres) | SQL, schema, constraints |
| Contract | in-memory RPC client | RPC contract and error projection |
| End-to-end | test HTTP server + real client | full transport round-trip |

`bun run test:integration:local` starts or reuses the shared local PostgreSQL
server, then runs `bun run test:integration`. Each test acquires, migrates, and
drops a uniquely named database; it never uses a workspace's development
database. `TEST_DATABASE_URL` must name a maintenance database whose user can
create and drop databases. CI supplies it through a PostgreSQL service container.

## Scaling

The layout scales by adding **module directories**, not a package per feature.
A pure type graduates to `packages/domain` when more than one layer reasons about
it (web renders it, rpc serializes it, services persist it); a value used by a
single port stays beside that port in `core`. Application services grow as
sibling module directories in `core`. Every service namespace has one boundary
file and one implementation file:

```txt
domain/src/agent/                         shared vocabulary — many consumers
core/src/agent-directory/
├── index.ts                              AgentDirectory namespace boundary
├── agent-directory.ts                    service implementation
└── agent-store/
    ├── index.ts                          AgentStore namespace boundary
    └── agent-store.ts                    port implementation
core/src/email/
├── index.ts                              EmailSender namespace boundary
└── email-sender.ts                       port + port-local value types
```

An `index.ts` only projects its implementation as a namespace:

```ts
export * as AgentDirectory from "./agent-directory.ts"
```

Implementation files export named declarations and never export a namespace of
themselves. Package exports point to `index.ts`; relative boundary imports use an
explicit `/index.ts`, while package consumers use the clean exported subpath.

Split a **new package** only when there is a real boundary:

- pure types are shared across apps → `packages/domain` (why it is a package, not
  a `core` directory: web and rpc consume it without reaching core's services);
- an adapter carries a heavy dependency → its own package, keeping `core` pure
  (e.g. a `billing-stripe` package owns the Stripe SDK, as `database` owns pg);
- code is reused across multiple apps, or is itself a deployable surface.

Features stay decoupled through **consumer-owned ports**: when one feature needs
another, it defines a narrow interface in its own terms and lets the composition
root supply the implementation — so cross-feature coupling never becomes a web.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start API and Web through Turbo and Portless. |
| `bun run dev:full` | Start Maple, then API and Web. |
| `bun run db:up` | Start the shared PostgreSQL container (all workspaces). |
| `bun run db:down` | Stop the shared container while preserving all data. |
| `bun run db:destroy` | Drop this workspace's database; leave the shared server up. |
| `bun run db:nuke` | Remove the shared container, network, and data volume. |
| `bun run check-types` | Type-check every package (with Effect compiler diagnostics) plus the Alchemy stack. |
| `bun run test` | Run the unit test suite. |
| `bun run test:integration` | Run isolated PostgreSQL integration tests against `TEST_DATABASE_URL`. |
| `bun run test:integration:local` | Start or reuse local PostgreSQL, then run integration tests. |
| `bun run check` | Format and lint. |
| `bun run check-arch` | Enforce the dependency arrows (dependency-cruiser). |
| `bun run knip` | Report unused files, exports, and dependencies. |
| `bun run db:generate` | Generate a migration from the schema. |
| `bun run telemetry:up` | Start or reuse the machine-level Maple process. |
| `bun run infra:deploy` | Provision Neon, Axiom, R2, and the email token via Alchemy. |
| `bun run infra:destroy` | Tear down all Alchemy-provisioned resources. |
