import { PgClient } from "@effect/sql-pg";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { Effect, Layer } from "effect";

import { PostgresPool } from "./postgres-pool/index.ts";

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
