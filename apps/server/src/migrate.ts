import { BunRuntime } from "@effect/platform-bun";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { Effect, Layer } from "effect";

import { loadDatabase } from "./config.ts";
import { effectDatabaseLayer } from "./infra/database.ts";
import { PostgresPool } from "./infra/postgres-pool/index.ts";

// Standalone entry: `bun run src/migrate.ts`. Run locally before `dev`, and as a
// pre-deploy step in production — the server itself boots without migrating.
// This is an application entry point: the one place Effect.provide belongs.
const migrationLayer = Layer.unwrap(
  Effect.map(loadDatabase, (configuration) =>
    effectDatabaseLayer.pipe(Layer.provide(PostgresPool.layer(configuration)))
  )
);

const migrate = DatabasePostgres.runMigrations.pipe(
  // @effect-diagnostics-next-line strictEffectProvide:off
  Effect.provide(migrationLayer)
);

BunRuntime.runMain(migrate);
