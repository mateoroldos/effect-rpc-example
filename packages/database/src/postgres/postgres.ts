import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Context, Effect, Layer, Schema } from "effect";
import { type CustomTypesConfig, types } from "pg";

import { migrationConfig } from "../migrations.ts";

/** Context service for an acquired, migrated PostgreSQL database. */
export class Service extends Context.Service<Service, EffectPgDatabase>()(
  "@effect-template/database/DatabasePostgres"
) {}

/** Acquires a PostgreSQL connection. Migrations run separately — see `runMigrations`. */
export const layer = Layer.effect(Service, makeWithDefaults());

/**
 * Applies pending migrations, then completes. Run this as an explicit step
 * locally, and as a pre-deploy step in production.
 */
export const runMigrations = Effect.gen(function* applyMigrations() {
  const database = yield* Service;
  yield* migrate(database, migrationConfig).pipe(
    Effect.mapError((cause) => new MigrationError({ cause }))
  );
});

// Postgres OIDs that node-pg eagerly parses into JS values (Date, etc.), but
// drizzle's Effect codecs decode from the raw string — date, timestamp[tz],
// interval, numeric[], and their array variants. Source: drizzle "Connect
// Effect Postgres" docs.
const drizzleRawStringOids = new Set([
  1082, 1114, 1184, 1186, 1231, 1115, 1185, 1187, 1182,
]);

/**
 * Keeps node-postgres compatible with Drizzle's Effect codecs by preserving
 * raw strings for codec-owned types and delegating all other types.
 */
export const typeParsers: CustomTypesConfig = {
  getTypeParser: (oid, format) =>
    drizzleRawStringOids.has(oid)
      ? (value: string) => value
      : types.getTypeParser(oid, format),
};

/** Indicates that PostgreSQL migrations could not be applied. */
export class MigrationError extends Schema.TaggedErrorClass<MigrationError>()(
  "DatabasePostgres.MigrationError",
  { cause: Schema.Defect() }
) {}
