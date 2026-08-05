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

```txt
database ─→ core ←─ rpc
                ↑
              server
```

| Package | Responsibility |
|---|---|
| `packages/core` | Domain types, application services, and the ports they depend on. |
| `packages/database` | PostgreSQL lifecycle and adapters implementing core ports. |
| `packages/rpc` | Transport-independent RPC contracts and their handlers. |
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
cp .env.example .env
bunx --no-install portless trust
bun run db:up
bun run dev
```

Edit `.env` before running a second workspace. `DEV_INSTANCE`, `POSTGRES_PORT`,
`DATABASE_URL`, and `API_URL` must describe that workspace and use an available
PostgreSQL port:

```env
DEV_INSTANCE=authentication
POSTGRES_PORT=5433
DATABASE_URL=postgresql://effect_template:effect_template@127.0.0.1:5433/effect_template
API_URL=https://authentication.api.effect-template.localhost
```

Turbo runs each package's `dev` script. Portless reads the package's `portless`
configuration, allocates its internal HTTP port, and runs `dev:app` through the
proxy. The explicit `DEV_INSTANCE` prefixes the configured names because
Portless detects Git worktrees but not JJ workspaces:

```text
Web  https://authentication.effect-template.localhost
API  https://authentication.api.effect-template.localhost
```

PostgreSQL is independent of the application lifecycle. `Ctrl+C` stops Turbo,
the API, and the Web process; run `bun run db:down` when PostgreSQL should stop.
The Compose project and volume use `DEV_INSTANCE`, so data remains isolated and
survives `db:down`. `db:destroy` removes that workspace's database volume.

Each application keeps a `dev:app` script for focused debugging without
Portless. Direct callers must provide that application's required environment.

## Observability

The API and web server export OTLP logs, metrics, and traces when the root
`.env` configures `OTEL_EXPORTER_OTLP_ENDPOINT`. The web server's RPC client
spans propagate trace context to the API, producing one cross-service trace
rooted at `AgentsRemote.*`.

For the complete local profile, [install Maple](https://maple.dev/docs/local-mode/),
then run:

```bash
bun run dev:full
```

This starts or reuses one machine-level Maple process and configures the apps to
export telemetry to it. Plain `bun run dev` does not require Maple.
`bun run telemetry:up` starts or reuses Maple independently. Maple persists
machine-level data under its default `~/.maple/data` directory.

### Production Better Stack

Create an OpenTelemetry source and use the values shown by
[Better Stack](https://betterstack.com/docs/logs/open-telemetry/):

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://<ingesting-host>
OTEL_EXPORTER_OTLP_HEADERS_JSON={"authorization":"Bearer <source-token>"}
```

Keep the source token in the deployment's secret store. Deployments must set
`APP_ENV` and `OTEL_SERVICE_NAME`, and should inject `OTEL_SERVICE_VERSION` from
release metadata.

| Variable | Default |
|---|---|
| `APP_ENV` | required |
| `LOG_LEVEL` | `Debug` locally, `Info` in production |
| `OTEL_SERVICE_NAME` | required |
| `OTEL_SERVICE_VERSION` | absent |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | absent (export disabled) |
| `OTEL_EXPORTER_OTLP_HEADERS_JSON` | absent (JSON object of exporter headers) |

## Add a feature

Follow the dependency arrows outward. Each step has a matching test tier.

1. **Domain** (`core`) — a Schema with branded, parsed values. → property test.
2. **Port** (`core`) — the narrowest interface the operation needs, beside the
   service that uses it.
3. **Service** (`core`) — sequence effects and policy through the port; return
   typed errors. → in-memory test.
4. **Adapter** (`database`) — implement the port against Postgres; translate
   technology errors. → real-database test.
5. **Contract + handler** (`rpc`) — the RPC entry and a handler that projects
   application errors to safe transport errors. → contract test.
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

## Scaling

The layout scales by adding **module directories inside pure packages**, not by a
package per feature. Domain and application services are pure, so they grow as
sibling module directories in `core` — the domain kept separate from the services
that use it:

```txt
core/src/agent/            domain module (pure value types)
core/src/agent-directory/  an application service + its port
core/src/billing/          another domain module
core/src/billing-ledger/   a service over it + its port
```

Split a **new package** only when there is a real boundary:

- an adapter carries a heavy dependency → its own package, keeping `core` pure
  (e.g. a `billing-stripe` package owns the Stripe SDK, as `database` owns pg);
- code is reused across multiple apps, or is itself a deployable surface.

Features stay decoupled through **consumer-owned ports**: when one feature needs
another, it defines a narrow interface in its own terms and lets the composition
root supply the implementation — so cross-feature coupling never becomes a web.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start API and Web through Turbo and Portless using root `.env`. |
| `bun run dev:full` | Start Maple, then API and Web with local telemetry enabled. |
| `bun run db:up` | Start this workspace's configured PostgreSQL container. |
| `bun run db:down` | Remove its container/network while preserving database data. |
| `bun run db:destroy` | Remove its container, network, and database volume. |
| `bun run check-types` | Type-check with Effect compiler diagnostics. |
| `bun run test` | Run the test suite. |
| `bun run check` | Format and lint. |
| `bun run knip` | Report unused files, exports, and dependencies. |
| `bun run db:generate` | Generate a migration from the schema. |
| `bun run telemetry:up` | Start or reuse the machine-level Maple process. |
