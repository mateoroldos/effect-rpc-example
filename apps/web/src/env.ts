import { defineEnvVars } from "@sveltejs/kit/env";
import { Schema } from "effect";

export const variables = defineEnvVars({
  // Dev: derived from DEV_INSTANCE in runtime.ts. Required in prod.
  API_URL: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  APP_ENV: {
    public: false,
    schema: Schema.toStandardSchemaV1(
      Schema.Literals(["development", "production"])
    ),
  },
  // Dev only; prefixes the OTel service name in runtime.ts.
  DEV_INSTANCE: {
    public: false,
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
