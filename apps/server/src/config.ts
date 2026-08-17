import { Config, Effect, Option, Redacted } from "effect";

type Environment = "development" | "production";

/** Parses the server process environment into legal adapter configuration. */
export const load = Effect.gen(function* loadServerConfiguration() {
  const environment = yield* loadEnvironment;
  const devInstance = yield* loadDevInstance;
  const origins = yield* loadOrigins(environment, devInstance);

  return {
    apiBaseUrl: origins.api,
    authSecret: yield* Config.redacted("BETTER_AUTH_SECRET"),
    databaseUrl: yield* loadDatabaseUrl(environment, devInstance),
    email: yield* loadEmail,
    httpPort: yield* Config.number("PORT").pipe(Config.withDefault(3000)),
    telemetry: yield* loadTelemetry(environment, devInstance),
    webBaseUrl: origins.web,
  };
});

/** Parses only database configuration for the migration composition root. */
export const loadDatabase = Effect.gen(function* loadDatabaseConfiguration() {
  return yield* loadDatabaseUrl(yield* loadEnvironment, yield* loadDevInstance);
});

const loadEnvironment = Config.literals(
  ["development", "production"],
  "APP_ENV"
);
const loadDevInstance = Config.option(Config.string("DEV_INSTANCE"));

const loadOrigins = (
  environment: Environment,
  devInstance: Option.Option<string>
) =>
  environment === "production"
    ? Effect.all({
        api: Config.url("BETTER_AUTH_URL"),
        web: Config.url("WEB_URL"),
      })
    : Effect.succeed(
        Option.match(devInstance, {
          onNone: () => ({
            api: new URL("http://localhost:3000"),
            web: new URL("http://localhost:5173"),
          }),
          onSome: (instance) => ({
            api: new URL(`https://${instance}.api.effect-template.localhost`),
            web: new URL(`https://${instance}.effect-template.localhost`),
          }),
        })
      );

const loadDatabaseUrl = (
  environment: Environment,
  devInstance: Option.Option<string>
) =>
  environment === "development" && Option.isSome(devInstance)
    ? Effect.succeed(
        Redacted.make(
          `postgresql://effect_template:effect_template@localhost:5432/eff_${devInstance.value.replaceAll("-", "_")}`
        )
      )
    : Config.redacted("DATABASE_URL");

const loadEmail = Effect.gen(function* loadEmailConfiguration() {
  const apiToken = yield* Config.option(
    Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN")
  );
  if (Option.isNone(apiToken)) {
    return { _tag: "Log" } as const;
  }
  return {
    _tag: "Cloudflare",
    accountId: yield* Config.string("CLOUDFLARE_ACCOUNT_ID"),
    apiToken: apiToken.value,
    fromAddress: yield* Config.string("EMAIL_FROM_ADDRESS"),
    fromName: yield* Config.string("EMAIL_FROM_NAME").pipe(
      Config.withDefault("effect-template")
    ),
  } as const;
});

const loadTelemetry = (
  environment: Environment,
  devInstance: Option.Option<string>
) =>
  Effect.gen(function* loadTelemetryConfiguration() {
    return {
      environment,
      logLevel: Option.getOrUndefined(
        yield* Config.option(Config.logLevel("LOG_LEVEL"))
      ),
      otlpEndpoint: Option.getOrUndefined(
        yield* Config.option(Config.string("OTEL_EXPORTER_OTLP_ENDPOINT"))
      ),
      otlpHeaders: Option.getOrUndefined(
        Option.map(
          yield* Config.option(
            Config.redacted("OTEL_EXPORTER_OTLP_HEADERS_JSON")
          ),
          Redacted.value
        )
      ),
      serviceName: Option.match(devInstance, {
        onNone: () => "effect-template-api",
        onSome: (instance) => `${instance}-api`,
      }),
      serviceVersion: Option.getOrUndefined(
        yield* Config.option(Config.string("OTEL_SERVICE_VERSION"))
      ),
    };
  });
