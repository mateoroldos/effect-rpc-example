# AGENTS.md

Effect v4 monorepo — typed RPC over HTTP with PostgreSQL persistence, composed
with Layers.

Domain vocabulary lives in [CONTEXT.md](./CONTEXT.md). Read it first, then name
things — in code, comments, and conversation — with those exact terms. When you
add or rename a domain concept, update CONTEXT.md in the same change.

## Commands

```bash
bun install
bun run env:setup      # seed each app's .env (create-if-missing)
bun run db:setup       # start shared Postgres, create + migrate this workspace's db
bun run dev            # API and Web through Portless
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

Arrows read "depends on". `domain` is the pure sink everyone points at.

```txt
core → domain          rpc → domain          database → core, domain
web  → rpc, domain      server → core, rpc, database, observability
```

- `packages/domain` — pure shared vocabulary (`Agent`, `AgentId`, `AgentName`); depends on nothing; consumed by web, rpc, core, and database.
- `packages/core` — application services and the ports they depend on (domain types now live in `domain`).
- `packages/database` — PostgreSQL adapters implementing core ports, drizzle config, schemas, and migrations.
- `packages/observability` — reusable server telemetry adapter; applications choose its configuration.
- `packages/rpc` — transport-independent RPC contracts; the concrete handlers are an inbound adapter in `apps/server`.
- `apps/server` — API composition root; provides concrete database, RPC, and telemetry Layers.
- `apps/web` — web composition root and traced server-side RPC client.

Domain code is pure (no I/O, time, randomness, config). Depend on ports, never
concrete adapters — only the composition root names implementations. Add a
capability as new **module directories**: pure shared types in `domain`
(`agent/`), and each application service beside its port in `core`
(`agent-directory/`). See **Domain & schemas** for when a type earns `domain`
versus staying beside its port. Reach for a new **package** only at a real
boundary — an adapter's heavy dependency, cross-app reuse, or a deployable.

## Web component organization

Organize the web app with a hybrid capability-and-component structure:

```txt
apps/web/src/lib/
├── components/ui/                    # generic shadcn-style primitives
├── features/
│   └── agents/
│       ├── agent-directory/           # a substantial component and its private files
│       │   ├── agent-directory.svelte
│       │   ├── agent-grid.svelte
│       │   └── agent-card.svelte
│       └── create-agent-form.svelte  # a cohesive standalone component
├── remotes/                          # SvelteKit remote adapters
└── server/                           # server-only runtime infrastructure
```

- Keep generic, domain-free visual primitives in `components/ui`; compose them
  into capability-specific UI under `features/<capability>`.
- Keep routes thin: route metadata, layout, and composition belong in routes;
  reusable behavior and presentation belong to the capability.
- Give a substantial component a kebab-case directory when it has private
  subcomponents, types, tests, or helpers. Keep a standalone component as one
  file until such a cluster exists.
- Keep private support files beside the component that owns them. Promote a file
  only when a second real caller needs it.
- Import feature files directly. Do not add feature `index.ts` barrels merely to
  shorten imports. Existing shadcn UI barrels are the primitive library's public
  interface and remain valid.
- Split components around meaningful behavior, accessibility, state ownership,
  or reusable presentation policy—not around every markup element. Do not wrap
  `CardTitle`, `CardDescription`, or another primitive with a pass-through
  capability component.
- Pass state explicitly while ownership is shallow. Use Svelte's typed
  `createContext` for a genuine compound component with deeply nested shared
  state. Do not add a context helper or `runed` until it hides repeated,
  non-trivial behavior; add it as a direct dependency if it is used.

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
(see `packages/domain/src/agent/agent.ts`):

```ts
export const AgentId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("AgentId"),
)
export type AgentId = typeof AgentId.Type
```

**Where a domain type lives.** `packages/domain` holds *shared vocabulary* — pure
types the system reasons about in more than one place (web renders them, rpc
serializes them, core and database persist them). Promote a type to `domain`
when a second independent consumer needs it or it crosses the client/server
boundary. Keep a pure type **beside its port** when one service is its only
consumer — purity alone does not earn promotion. `Agent`/`AgentId` live in
`domain`; `EmailAddress`/`EmailMessage` stay in `core/email/email-sender.ts` as
the `EmailSender` port's input contract.

## Full-stack RPC feature

Keep framework, transport, application, and persistence concerns in separate,
small modules. An Agent feature follows this shape:

```txt
apps/web/src/routes/+page.svelte
  → apps/web/src/lib/features/agents/                    Agent UI composition
    → apps/web/src/lib/remotes/agents.remote.ts          SvelteKit adapter
    → apps/web/src/lib/server/remotes/rpc.ts              remote runner
      → apps/web/src/lib/server/rpc/client.ts             shared AppRpc client
        → apps/web/src/lib/server/runtime.ts              ManagedRuntime
          → HTTP /rpc
            → apps/server/src/layers/rpc.ts              AppRpc server
              → apps/server/src/layers/agents-rpc-server.ts  Agent handlers (inbound adapter)
                → packages/core/src/agent-directory/agent-directory.ts
                  → packages/core AgentStore port
                    → packages/database PostgreSQL adapter
```

### Types and schemas

Schemas have one owner and are composed outward:

```txt
domain schemas (packages/domain)
  AgentName, AgentId, Agent
    ↓
rpc operation schemas
  CreateAgentInput = { name: AgentName }
  GetAgentInput    = { id: AgentId }
    ↓
SvelteKit remote validation
  Schema.toStandardSchemaV1(AgentsRpc.CreateAgentInput)
```

- `domain` owns domain values and invariants; `core` services build on them.
- `rpc` owns named wire input schemas and reuses domain schemas inside them.
- `web` reuses the RPC input schema; it does not restate DTO validation.
- Name schemas only for real payloads. An operation with no input omits
  `payload`; never invent an empty struct.
- RPC success schemas reuse core output schemas unless the wire representation
  intentionally differs.

### RPC groups, client, and runtime

Feature packages own groups such as `AgentsRpc.group`. `AppRpc.group` merges all
feature groups and is the only group registered by the HTTP server and consumed
by the web client. Add future capabilities to that aggregate group.

The web app has one shared protocol, schema-aware `AppRpcClient`, and runtime.
Build the client once as a Layer in the `ManagedRuntime`; do not call
`RpcClient.make` per operation. Remote adapters call the typed RPC operation
directly through `runRpc`:

`runRpc` receives the current request's cancellation signal, preserves typed
failures with `Effect.result`, and maps the application-wide `RpcClientError` to
a 503 response. Feature errors remain visible to the remote adapter. The shared
`ManagedRuntime` is disposed by the SvelteKit server lifecycle hook during
adapter-node shutdown.

### Remote adapters and errors

A `.remote.ts` module owns only SvelteKit concerns: validation, HTTP error
projection, and query refreshes. Keep error handling inline so the operation's
inferred error union remains visible and exhaustive:

```ts
const agents = await runRpc(
  (client) => client["Agents.List"](),
  (failure) =>
    Match.value(failure).pipe(
      Match.tagsExhaustive({
        "AgentsRpc.Unavailable": () =>
          error(503, "The Agents service is unavailable"),
      }),
    ),
)
```

`runRpc` uses `Effect.result` before crossing into Promise code. Therefore:

```txt
typed Effect failure → inferred exhaustive Match → SvelteKit error response
defect / interruption → remains rejected       → SvelteKit handleError / 500
```

Do not inspect `unknown`, broadly catch rejected Promises, or maintain a global
registry of every feature error. `runRpc` owns shared transport projection;
each remote operation maps its own typed feature failures inline. Adding a new
feature error must make `Match.tagsExhaustive` fail compilation until that
operation handles it.

Keep `.remote.ts` modules outside `src/lib/server`; SvelteKit forbids remote
files in that directory. Remote callbacks are framework adapters, so
`async`/`await` is allowed there. For a client-requested single-flight mutation,
the client names each query update with `form.submit().updates(...)`; the remote
form authorizes a bounded number of those requests and refreshes them in the
same response:

```ts
await runRpc(
  (client) => client["Agents.Create"]({ name }),
  (failure) =>
    Match.value(failure).pipe(
      Match.tagsExhaustive({
        "AgentsRpc.Unavailable": () =>
          error(503, "The Agents service is unavailable"),
      }),
    ),
)
await requested(getAgents, 1).refreshAll()
```

Treat the requested queries as untrusted input: keep the limit explicit and
accept only the exact query functions that the mutation can invalidate.

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
| `new Promise`, `async function` in Effect/application code | `Effect.gen` |
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

- Wire concrete Layers only in deployable composition roots: `apps/server` for
  the API and `apps/web/src/lib/server/runtime.ts` for the web server.
- Export only what a caller consumes. An in-file-only helper (like a service's
  `make`) stays a non-exported `const` — `knip` cannot flag these because they
  live in entry files, so it is a review rule. Do not widen `exports` for tests.
- Keep each package service module's `export * as` barrel and its `biome-ignore`
  comment. Web remote adapters call the shared `AppRpcClient` directly; do not
  add pass-through feature clients.
- Do not hand-edit generated migrations under `packages/database/drizzle`.
