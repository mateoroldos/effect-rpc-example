import { PgClient } from "@effect/sql-pg";
import { authRelations } from "@effect-template/database/auth-schema";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer } from "effect";

import { PostgresPool } from "./postgres-pool/index.ts";

// Better Auth requires Promise-based Drizzle while application persistence requires Effect Drizzle. Both views share one Pool so lifecycle and connection limits have one owner.
/** Promise-based Drizzle database used by Better Auth. */
export const betterAuthDatabase = Effect.map(PostgresPool.Service, (pool) =>
  drizzle({ client: pool, relations: { ...authRelations } })
);

/** Effect PostgreSQL client over the server's shared Pool. */
const postgresClientLayer = Layer.unwrap(
  Effect.map(PostgresPool.Service, (pool) =>
    PgClient.layerFrom(
      PgClient.fromPool({
        acquire: Effect.succeed(pool),
        spanAttributes: { "peer.service": "postgresql" },
        types: DatabasePostgres.typeParsers,
      })
    )
  )
);

/** Effect Drizzle database derived from the shared PostgreSQL Pool. */
export const effectDatabaseLayer = DatabasePostgres.layer.pipe(
  Layer.provide(postgresClientLayer)
);
