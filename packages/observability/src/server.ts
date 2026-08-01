import { Layer, Logger, type LogLevel, References, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp } from "effect/unstable/observability";

/** Configuration shared by server-side application telemetry runtimes. */
export interface ServerTelemetryOptions {
  /** Deployment environment attached to every exported signal. */
  readonly environment: "development" | "production";
  /** Minimum Effect log level; defaults to Debug in development, Info otherwise. */
  readonly logLevel?: LogLevel.LogLevel | undefined;
  /** OTLP HTTP base endpoint; absent disables export. */
  readonly otlpEndpoint?: string | undefined;
  /** Comma-separated OpenTelemetry exporter headers (`key=value,key=value`). */
  readonly otlpHeaders?: string | undefined;
  /** Stable OTel service identity for this deployable. */
  readonly serviceName: string;
  /** Build or release identity when available. */
  readonly serviceVersion?: string | undefined;
}

const OtlpHeaders = Schema.UndefinedOr(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))
);

/**
 * Decodes optional OTLP exporter headers from a JSON object string, e.g.
 * `{"authorization":"Basic dXNlcg=="}`. JSON keeps token, base64, and whitespace
 * values intact and fails loudly on malformed input; absent input stays absent.
 */
const parseHeaders = Schema.decodeSync(OtlpHeaders);

/** Builds console logging and optional native Effect OTLP telemetry export. */
export const makeServerLayer = (options: ServerTelemetryOptions) => {
  const consoleLayer = Logger.layer([
    options.environment === "development"
      ? Logger.consolePretty()
      : Logger.consoleJson,
  ]);
  const logLevelLayer = Layer.succeed(
    References.MinimumLogLevel,
    options.logLevel ??
      (options.environment === "development" ? "Debug" : "Info")
  );

  if (options.otlpEndpoint === undefined) {
    return Layer.merge(consoleLayer, logLevelLayer);
  }

  const exporterLayer = Otlp.layerJson({
    baseUrl: options.otlpEndpoint,
    headers: parseHeaders(options.otlpHeaders),
    loggerMergeWithExisting: true,
    resource: {
      attributes: {
        "deployment.environment.name": options.environment,
      },
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion,
    },
  }).pipe(Layer.provide(FetchHttpClient.layer));

  return Layer.mergeAll(consoleLayer, logLevelLayer, exporterLayer);
};
