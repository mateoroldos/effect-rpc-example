import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Context, Effect, Layer, Schema } from "effect";

import { migrationConfig } from "./migrations.ts";

/** Context service for an acquired, migrated PostgreSQL database. */
export class Service extends Context.Service<Service, EffectPgDatabase>()(
  "@effect-template/database/DatabasePostgres"
) {}

/** Acquires PostgreSQL and applies migrations before exposing the database. */
export const layer = Layer.effect(
  Service,
  Effect.gen(function* makeDatabasePostgres() {
    const database = yield* makeWithDefaults();
    yield* migrate(database, migrationConfig).pipe(
      Effect.mapError((cause) => new MigrationError({ cause }))
    );
    return database;
  })
);

/** Indicates that PostgreSQL migrations could not be applied. */
export class MigrationError extends Schema.TaggedErrorClass<MigrationError>()(
  "DatabasePostgres.MigrationError",
  { cause: Schema.Defect() }
) {}

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as DatabasePostgres from "./postgres.ts";
