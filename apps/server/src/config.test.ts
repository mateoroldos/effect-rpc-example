import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Redacted } from "effect";

import { load } from "./config.ts";

const loadWith = (values: Record<string, unknown>) =>
  load.pipe(
    // @effect-diagnostics-next-line strictEffectProvide:off
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(values)))
  );

describe("ServerConfig", () => {
  it.effect("derives Portless development resources from DEV_INSTANCE", () =>
    Effect.gen(function* () {
      const configuration = yield* loadWith({
        APP_ENV: "development",
        BETTER_AUTH_SECRET: "development-secret-at-least-32-characters",
        DEV_INSTANCE: "auth-workspace",
      });

      assert.strictEqual(
        configuration.apiBaseUrl.href,
        "https://auth-workspace.api.effect-template.localhost/"
      );
      assert.strictEqual(
        configuration.webBaseUrl.href,
        "https://auth-workspace.effect-template.localhost/"
      );
      assert.include(
        Redacted.value(configuration.databaseUrl),
        "/eff_auth_workspace"
      );
    })
  );

  it.effect(
    "uses localhost and an explicit database for direct development",
    () =>
      Effect.gen(function* () {
        const configuration = yield* loadWith({
          APP_ENV: "development",
          BETTER_AUTH_SECRET: "development-secret-at-least-32-characters",
          DATABASE_URL: "postgresql://localhost/direct",
        });

        assert.strictEqual(
          configuration.apiBaseUrl.href,
          "http://localhost:3000/"
        );
        assert.strictEqual(
          configuration.webBaseUrl.href,
          "http://localhost:5173/"
        );
      })
  );

  it.effect("requires explicit production URLs", () =>
    loadWith({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      DATABASE_URL: "postgresql://production/database",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "BETTER_AUTH_URL");
        })
      )
    )
  );

  it.effect("rejects a short authentication secret", () =>
    loadWith({
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "short",
      DATABASE_URL: "postgresql://localhost/direct",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "at least 32 characters");
        })
      )
    )
  );

  it.effect("rejects a production URL containing a path", () =>
    loadWith({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.com/api/auth",
      DATABASE_URL: "postgresql://production/database",
      WEB_URL: "https://example.com",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "must be an origin");
        })
      )
    )
  );

  it.effect("requires email delivery in production", () =>
    loadWith({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.com",
      DATABASE_URL: "postgresql://production/database",
      WEB_URL: "https://example.com",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "CLOUDFLARE_EMAIL_API_TOKEN");
        })
      )
    )
  );

  it.effect("requires complete Cloudflare email configuration", () =>
    loadWith({
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "development-secret-at-least-32-characters",
      CLOUDFLARE_EMAIL_API_TOKEN: "token",
      DATABASE_URL: "postgresql://localhost/direct",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "CLOUDFLARE_ACCOUNT_ID");
        })
      )
    )
  );
});
