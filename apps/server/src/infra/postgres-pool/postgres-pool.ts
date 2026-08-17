import { DatabasePostgres } from "@effect-template/database/postgres";
import { Context, Effect, Layer, Redacted } from "effect";
import { Pool } from "pg";

/** Shared node-postgres Pool owned by the server composition root. */
export type Interface = Pool;

/** Context service for the server's shared PostgreSQL Pool. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/server/PostgresPool"
) {}

const make = (url: Redacted.Redacted<string>) =>
  Effect.acquireRelease(
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

/** Acquires the server's shared PostgreSQL Pool for the enclosing scope. */
export const layer = (url: Redacted.Redacted<string>) =>
  Layer.effect(Service, make(url));
