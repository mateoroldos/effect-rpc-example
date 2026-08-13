import { Config, Effect, Random, Redacted, Schema, type Scope } from "effect";
import { Client } from "pg";

const adminDatabaseUrl = Config.redacted("TEST_DATABASE_URL").pipe(
  Config.withDefault(
    Redacted.make(
      "postgresql://effect_template:effect_template@localhost:5432/postgres"
    )
  )
);

/** Indicates that disposable PostgreSQL test infrastructure failed. */
export class DisposablePostgresError extends Schema.TaggedErrorClass<DisposablePostgresError>()(
  "DisposablePostgresError",
  {
    cause: Schema.Defect(),
    operation: Schema.Literals(["connect", "create", "drop"]),
  }
) {}

/** Acquires and finally drops an isolated PostgreSQL database. */
export const acquireDisposableDatabaseUrl: Effect.Effect<
  Redacted.Redacted<string>,
  DisposablePostgresError,
  Scope.Scope
> = Effect.gen(function* () {
  const configuredUrl = yield* adminDatabaseUrl.pipe(
    Effect.mapError(
      (cause) => new DisposablePostgresError({ cause, operation: "connect" })
    )
  );
  const url = yield* parseUrl(configuredUrl);
  const client = yield* acquireAdminClient(url);
  const suffix = yield* Random.nextIntBetween(100_000_000, 1_000_000_000);
  const databaseName = `eff_integration_${suffix}`;
  const databaseUrl = new URL(url);
  databaseUrl.pathname = `/${databaseName}`;

  return yield* Effect.acquireRelease(
    Effect.tryPromise({
      catch: (cause) =>
        new DisposablePostgresError({ cause, operation: "create" }),
      try: () => client.query(`CREATE DATABASE "${databaseName}"`),
    }).pipe(Effect.as(Redacted.make(databaseUrl.href))),
    () =>
      Effect.tryPromise({
        catch: (cause) =>
          new DisposablePostgresError({ cause, operation: "drop" }),
        try: () =>
          client.query(
            `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`
          ),
      }).pipe(Effect.orDie)
  );
});

const parseUrl = (url: Redacted.Redacted<string>) =>
  Effect.try({
    catch: (cause) =>
      new DisposablePostgresError({ cause, operation: "connect" }),
    try: () => new URL(Redacted.value(url)),
  });

const acquireAdminClient = (url: URL) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const client = yield* Effect.try({
        catch: (cause) =>
          new DisposablePostgresError({ cause, operation: "connect" }),
        try: () => new Client({ connectionString: url.href }),
      });
      yield* Effect.tryPromise({
        catch: (cause) =>
          new DisposablePostgresError({ cause, operation: "connect" }),
        try: () => client.connect(),
      });
      return client;
    }),
    (client) => Effect.promise(() => client.end())
  );
