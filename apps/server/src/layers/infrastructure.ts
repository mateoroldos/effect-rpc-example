import { PgClient } from "@effect/sql-pg";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { Config, Layer } from "effect";

const postgresClientLayer = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
});

/** Shared migrated PostgreSQL database for server features. */
export const databaseLayer = DatabasePostgres.layer.pipe(
  Layer.provide(postgresClientLayer)
);
