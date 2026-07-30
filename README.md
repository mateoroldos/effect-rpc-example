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
| `apps/server` | Composition root — provides every Layer and launches the process. |

The composition root wires the graph in one place, and Effect memoizes shared
infrastructure (database pool, config, clock) so it is built exactly once:

```txt
appLayer
├─ rpcLayer                     HTTP transport + registered handlers
│  └─ agents handlers ── AgentDirectory ── AgentStore (Postgres adapter)
├─ databaseLayer                PostgreSQL, migrated, from DATABASE_URL
├─ crypto / serialization
└─ http server (:3000)
```

## Quick start

```bash
bun install
export DATABASE_URL=postgres://user:pass@localhost:5432/app
bun run dev            # server on http://localhost:3000
```

Migrations run before the database becomes available; configuration is read once
at startup through Effect `Config`.

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
| `bun run dev` | Run the server in watch mode. |
| `bun run check-types` | Type-check with Effect compiler diagnostics. |
| `bun run test` | Run the test suite. |
| `bun run check` | Format and lint. |
| `bun run knip` | Report unused files, exports, and dependencies. |
| `bun run db:generate` | Generate a migration from the schema. |
