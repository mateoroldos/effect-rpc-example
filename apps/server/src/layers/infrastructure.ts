import { DatabasePostgres } from "@effect-template/database/postgres";
import { Config, Layer, Redacted } from "effect";

/** DATABASE_URL when set (prod/Neon), else this workspace's database in the
 * shared local Postgres: eff_<DEV_INSTANCE> (hyphens → underscores). The
 * database is created on demand by `db:migrate`. */
const databaseUrl = Config.redacted("DATABASE_URL").pipe(
  Config.orElse(() =>
    Config.string("DEV_INSTANCE").pipe(
      Config.map((instance) =>
        Redacted.make(
          `postgresql://effect_template:effect_template@localhost:5432/eff_${instance.replaceAll("-", "_")}`
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
