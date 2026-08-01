import { defineEnvVars } from "@sveltejs/kit/env";
import { Schema } from "effect";

export const variables = defineEnvVars({
  API_URL: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.NonEmptyString),
  },
  APP_ENV: {
    public: false,
    schema: Schema.toStandardSchemaV1(
      Schema.Literals(["development", "production"])
    ),
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  OTEL_EXPORTER_OTLP_HEADERS_JSON: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
  OTEL_SERVICE_NAME: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.NonEmptyString),
  },
  OTEL_SERVICE_VERSION: {
    public: false,
    schema: Schema.toStandardSchemaV1(Schema.optional(Schema.NonEmptyString)),
  },
});
