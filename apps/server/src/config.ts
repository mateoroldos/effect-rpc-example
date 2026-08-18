import { EmailSender } from "@effect-template/core/email";
import { Config, Effect, Option, Redacted, Schema, SchemaIssue } from "effect";

type Environment = "development" | "production";

/** Parses the server process environment into legal adapter configuration. */
export const load = Effect.gen(function* loadServerConfiguration() {
  const environment = yield* loadEnvironment;
  const devInstance = yield* loadDevInstance;
  const publicOrigins = yield* loadPublicOrigins;
  return {
    authSecret: yield* loadAuthSecret,
    databaseUrl: yield* loadDatabaseUrl(environment, devInstance),
    email: yield* loadEmail(environment),
    httpPort: yield* Config.port("PORT").pipe(Config.withDefault(3000)),
    publicOrigins,
    telemetry: yield* loadTelemetry(environment, devInstance),
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
const loadDevInstance = Config.option(
  Config.schema(
    Schema.String.pipe(
      Schema.check(Schema.isPattern(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/))
    ),
    "DEV_INSTANCE"
  )
);

const loadAuthSecret = Effect.gen(function* loadAuthSecretConfiguration() {
  const secret = yield* Config.redacted("BETTER_AUTH_SECRET");
  if (Redacted.value(secret).length < 32) {
    return yield* configurationFailure(
      "BETTER_AUTH_SECRET must contain at least 32 characters"
    );
  }
  return secret;
});

const loadPublicOrigins = Config.schema(
  Schema.String.pipe(
    Schema.check(
      Schema.isPattern(
        /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
      )
    )
  ),
  "APP_DOMAIN"
).pipe(
  Effect.map((domain) => ({
    api: new URL(`https://api.${domain}`),
    cookieDomain: domain,
    web: new URL(`https://app.${domain}`),
  }))
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

const loadEmail = (environment: Environment) =>
  Effect.gen(function* loadEmailConfiguration() {
    const apiToken =
      environment === "production"
        ? Option.some(yield* Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN"))
        : yield* Config.option(Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN"));
    if (Option.isNone(apiToken)) {
      return { _tag: "Log" } as const;
    }
    return {
      _tag: "Cloudflare",
      accountId: yield* Config.nonEmptyString("CLOUDFLARE_ACCOUNT_ID"),
      apiToken: apiToken.value,
      fromAddress: yield* Config.schema(
        EmailSender.EmailAddress,
        "EMAIL_FROM_ADDRESS"
      ),
      fromName: yield* Config.nonEmptyString("EMAIL_FROM_NAME").pipe(
        Config.withDefault("effect-template")
      ),
    } as const;
  });

const loadOtlpHeaders = Effect.gen(function* loadOtlpHeadersConfiguration() {
  const encoded = yield* Config.option(
    Config.redacted("OTEL_EXPORTER_OTLP_HEADERS_JSON")
  );
  if (Option.isNone(encoded)) {
    return;
  }
  const headers = Schema.decodeUnknownOption(
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))
  )(Redacted.value(encoded.value));
  if (Option.isNone(headers)) {
    return yield* configurationFailure(
      "OTEL_EXPORTER_OTLP_HEADERS_JSON must be a JSON object of string values"
    );
  }
  return headers.value;
});

const configurationFailure = (message: string) =>
  Config.fail(
    new Schema.SchemaError(
      new SchemaIssue.InvalidValue(Option.none(), { message })
    )
  );

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
        Option.map(
          yield* Config.option(Config.url("OTEL_EXPORTER_OTLP_ENDPOINT")),
          (url) => url.toString()
        )
      ),
      otlpHeaders: yield* loadOtlpHeaders,
      serviceName: Option.match(devInstance, {
        onNone: () => "effect-template-api",
        onSome: (instance) => `${instance}-api`,
      }),
      serviceVersion: Option.getOrUndefined(
        yield* Config.option(Config.string("OTEL_SERVICE_VERSION"))
      ),
    };
  });
