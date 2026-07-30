import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { Effect, Layer } from "effect";

import { migrationConfig } from "../migrations.ts";
import { DatabasePostgres } from "../postgres.ts";

const clientLayer = PgliteClient.layer();

/** Provides an isolated migrated PGlite database for tests. */
export const databasePgliteLayer = Layer.effect(
  DatabasePostgres.Service,
  Effect.gen(function* makeDatabasePglite() {
    const database = yield* makeWithDefaults();
    yield* migrate(database, migrationConfig).pipe(
      Effect.mapError((cause) => new DatabasePostgres.MigrationError({ cause }))
    );
    return database;
  })
).pipe(Layer.provide(clientLayer));
