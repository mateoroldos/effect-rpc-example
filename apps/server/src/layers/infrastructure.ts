import { DatabasePostgres } from "@effect-template/database/postgres";
import { Config, Layer } from "effect";

/** PostgreSQL client from DATABASE_URL — shared by the runtime and the migrator entry. */
export const postgresClientLayer = DatabasePostgres.clientLayer(
  Config.redacted("DATABASE_URL")
);

/** Shared migrated PostgreSQL database for server features. */
export const databaseLayer = DatabasePostgres.layer.pipe(
  Layer.provide(postgresClientLayer)
);
