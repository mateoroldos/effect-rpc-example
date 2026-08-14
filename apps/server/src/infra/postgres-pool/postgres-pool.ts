import { DatabasePostgres } from "@effect-template/database/postgres";
import { Config, Context, Effect, Layer, Redacted } from "effect";
import { Pool } from "pg";

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

/** Shared node-postgres Pool owned by the server composition root. */
export type Interface = Pool;

/** Context service for the server's shared PostgreSQL Pool. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/server/PostgresPool"
) {}

const make = Effect.gen(function* makePostgresPool() {
  const url = yield* databaseUrl;

  return yield* Effect.acquireRelease(
    Effect.sync(() => {
      const pool = new Pool({
        connectionString: Redacted.value(url),
        types: DatabasePostgres.typeParsers,
      });
      pool.on("error", () => {
        // `pg` requires this listener for idle clients; query operations report actionable failures through their own Effect boundaries.
      });
      return pool;
    }),
    (pool) => Effect.promise(() => pool.end())
  );
});

/** Acquires the server's shared PostgreSQL Pool for the enclosing scope. */
export const layer = Layer.effect(Service, make);
