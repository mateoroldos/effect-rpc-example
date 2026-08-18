import { defineEnvVars } from "@sveltejs/kit/env";
import { Schema } from "effect";

export const variables = defineEnvVars({
  // Derived from DEV_INSTANCE in development; required in production.
  API_URL: {
    public: true,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  APP_ENV: {
    public: false,
    schema: Schema.toStandardSchemaV1(
      Schema.Literals(["development", "production"])
    ),
  },
  // Dev only; derives public service URLs and prefixes telemetry names.
  DEV_INSTANCE: {
    public: true,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  LOG_LEVEL: {
    public: false,
    schema: Schema.toStandardSchemaV1(
      Schema.optional(
        Schema.Literals([
          "All",
          "Fatal",
          "Error",
          "Warn",
          "Info",
          "Debug",
          "Trace",
          "None",
        ])
      )
    ),
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  OTEL_EXPORTER_OTLP_HEADERS_JSON: {
    public: false,
    schema: Schema.toStandardSchemaV1(
      Schema.optional(
        Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))
      )
    ),
  },
  OTEL_SERVICE_VERSION: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
});
