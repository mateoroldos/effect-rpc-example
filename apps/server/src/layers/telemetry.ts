import { makeServerLayer } from "@effect-template/observability";
import { Config, Effect, Layer, Option, Redacted } from "effect";

const environment = Config.literals(["development", "production"], "APP_ENV");
const configuredLogLevel = Config.option(Config.logLevel("LOG_LEVEL"));
const otlpEndpoint = Config.option(
  Config.string("OTEL_EXPORTER_OTLP_ENDPOINT")
);
const otlpHeaders = Config.option(
  Config.redacted("OTEL_EXPORTER_OTLP_HEADERS_JSON")
);
const serviceName = Config.string("OTEL_SERVICE_NAME");
const serviceVersion = Config.option(Config.string("OTEL_SERVICE_VERSION"));

/** Runtime logging and optional OTLP export for logs, metrics, and traces. */
export const telemetryLayer = Layer.unwrap(
  Effect.gen(function* () {
    return makeServerLayer({
      environment: yield* environment,
      logLevel: Option.getOrUndefined(yield* configuredLogLevel),
      otlpEndpoint: Option.getOrUndefined(yield* otlpEndpoint),
      otlpHeaders: Option.getOrUndefined(
        Option.map(yield* otlpHeaders, Redacted.value)
      ),
      serviceName: yield* serviceName,
      serviceVersion: Option.getOrUndefined(yield* serviceVersion),
    });
  })
);
