import { Layer, Logger, type LogLevel, References } from "effect";
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
  /** Parsed OpenTelemetry exporter headers. */
  readonly otlpHeaders?: Readonly<Record<string, string>> | undefined;
  /** Stable OTel service identity for this deployable. */
  readonly serviceName: string;
  /** Build or release identity when available. */
  readonly serviceVersion?: string | undefined;
}

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
    headers: options.otlpHeaders,
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
