import { DatabasePostgres } from "@effect-template/database/postgres";
import { Config, Layer, Redacted } from "effect";

/** DATABASE_URL when set (prod/Neon), else built from POSTGRES_PORT for local docker-compose. */
const databaseUrl = Config.redacted("DATABASE_URL").pipe(
  Config.orElse(() =>
    Config.number("POSTGRES_PORT").pipe(
      Config.map((port) =>
        Redacted.make(
          `postgresql://effect_template:effect_template@localhost:${port}/effect_template`
        )
      )
    )
  )
);

/** PostgreSQL client — shared by the runtime and the migrator entry. */
export const postgresClientLayer = DatabasePostgres.clientLayer(databaseUrl);

/** Shared migrated PostgreSQL database for server features. */
export const databaseLayer = DatabasePostgres.layer.pipe(
  Layer.provide(postgresClientLayer)
);
