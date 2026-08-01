# AGENTS.md

Effect v4 monorepo — typed RPC over HTTP with PostgreSQL persistence, composed
with Layers.

Domain vocabulary lives in [CONTEXT.md](./CONTEXT.md). Read it first, then name
things — in code, comments, and conversation — with those exact terms. When you
add or rename a domain concept, update CONTEXT.md in the same change.

## Commands

```bash
bun install
bun run dev            # server on :3000 (reads DATABASE_URL)
bun run check-types    # tsc + Effect compiler diagnostics
bun run test           # vitest
bun run check          # format + lint (biome)
bun run knip           # dead files / exports / dependencies
```

A change is done only when `check-types`, `test`, `check`, and `knip` all pass.

## Architecture

Dependencies point one way. Packages leave their Layer requirements open;
`apps/server` is the composition root that provides the concrete implementations
— database, crypto, HTTP. Tests provide their own substitutes.

```txt
database ─→ core ←─ rpc
                ↑
              server
```

- `packages/core` — domain types, application services, and the ports they depend on.
- `packages/database` — PostgreSQL adapters implementing core ports, drizzle config, schemas, and migrations.
- `packages/rpc` — transport-independent RPC contracts and handlers.
- `apps/server` — composition root; provides every Layer, launches Bun.

Domain code is pure (no I/O, time, randomness, config). Depend on ports, never
concrete adapters — only the composition root names implementations. Add a
capability as new **module directories** in `core`: a pure domain module
(`agent/`) and, separately, each application service beside its port
(`agent-directory/`). Reach for a new **package** only at a real boundary — an
adapter's heavy dependency, cross-app reuse, or a deployable.

## Module shape

One service per file, always this shape (see `agent-directory.ts`):

```ts
export interface Interface {
  readonly create: (input: CreateInput) => Effect.Effect<Agent, CreateError>
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/AgentDirectory", // tag string mirrors the module path
) {}

export const make = Effect.gen(function* () {
  const store = yield* AgentStore.Service // yield dependencies once, at build time
  const create = Effect.fn("AgentDirectory.create")(function* (input) {
    /* … */
  }) // every effectful op gets a named span
  return Service.of({ create })
})

export const layerWithoutDependencies = Layer.effect(Service, make) // requirements open
export const layer = layerWithoutDependencies.pipe(Layer.provide(AgentStore.layer))

export * as AgentDirectory from "./agent-directory.ts" // module's public identity
```

`layerWithoutDependencies` leaves requirements unfilled for composition; `layer`
is production-ready. Yield stable deps while building; yield request-scoped
values inside the method that uses them.

## Domain & schemas

Parse untrusted input into branded types at the edge; pass domain types inward
(see `agent.ts`):

```ts
export const AgentId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("AgentId"),
)
export type AgentId = typeof AgentId.Type
```

## Errors

Expected failures are typed values, never thrown. Use tagged errors and project
them at boundaries so infrastructure detail never leaks to callers:

```ts
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentDirectory.NotFound",
  { id: AgentId },
) {}

// in an adapter: translate a technology error into the port's error type
directory.get(id).pipe(
  Effect.catchTag("AgentStore.PersistenceError", () =>
    new AgentsRpc.Unavailable()),
)
```

## Observability

Use named `Effect.fn` spans for meaningful operations and rely on native transport
spans for request and RPC completion. Use metrics for aggregates and logs for
retries, fallbacks, and exhausted work—not routine success. Keep response logging
disabled unless access logs are required. Do not duplicate native failure events
with manual error categories or error attributes. Project errors safely at RPC
boundaries while nested spans preserve internal failures. Telemetry must not
contain payloads, headers, SQL, credentials, names, IDs, or foreign messages.
Attach only bounded, safe attributes where their facts are owned. Preserve
failures, defects, and interruptions exactly; observability must not retry or
change business outcomes.

## Never reach for a global

Use the Effect service. `check-types` fails on the left column.

| Instead of | Use |
|---|---|
| `Date.now()`, `new Date()` | `Clock` |
| `Math.random()`, `crypto.randomUUID()` | `Random`, `Crypto` |
| `process.env` | `Config` |
| `fetch` | `HttpClient` |
| `setTimeout`, `setInterval` | `Effect.sleep`, `Schedule` |
| `new Promise`, `async function` | `Effect.gen` |
| `class extends Error` | `Schema.TaggedErrorClass` |

Also rejected: a floating (unhandled) Effect, providing implementations outside
`apps/server`, and casting away an Effect's error or requirement channel.

## Testing

Test through the public interface with real seams — never mock modules. Provide
a substitute Layer instead:

```ts
it.layer(
  AgentDirectory.layerWithoutDependencies.pipe(
    Layer.provide(AgentStore.layerMemory),
    Layer.provide(cryptoLayer),
  ),
)("create and get", (test) => {
  /* … */
})
```

| Seam | Verifies |
|---|---|
| `layerMemory` | service policy in isolation |
| PGlite | SQL, schema, constraints |
| `RpcTest.makeClient` | RPC contract and error projection |
| `NodeHttpServer.layerTest` | HTTP round-trip |

Use property tests for parsers and branded types.

## Boundaries

- Never wire concrete Layers outside `apps/server`.
- Export only what a caller consumes. An in-file-only helper (like a service's
  `make`) stays a non-exported `const` — `knip` cannot flag these because they
  live in entry files, so it is a review rule. Do not widen `exports` for tests.
- Keep each module's `export * as` barrel and its `biome-ignore` comment.
- Do not hand-edit generated migrations under `packages/database/drizzle`.
