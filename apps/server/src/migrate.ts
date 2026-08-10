import { BunRuntime } from "@effect/platform-bun";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { Effect } from "effect";

import { postgresClientLayer } from "./infra/database.ts";

// Standalone entry: `bun run src/migrate.ts`. Run locally before `dev`, and as a
// pre-deploy step in production — the server itself boots without migrating.
// This is an application entry point: the one place Effect.provide belongs.
BunRuntime.runMain(
  // @effect-diagnostics-next-line strictEffectProvide:off
  DatabasePostgres.runMigrations.pipe(Effect.provide(postgresClientLayer))
);
