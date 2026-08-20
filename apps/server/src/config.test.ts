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
        APP_DOMAIN: "auth-workspace.effect-template.localhost",
        APP_ENV: "development",
        BETTER_AUTH_SECRET: "development-secret-at-least-32-characters",
        DEV_INSTANCE: "auth-workspace",
      });

      assert.strictEqual(
        configuration.publicOrigins.api.href,
        "https://api.auth-workspace.effect-template.localhost/"
      );
      assert.strictEqual(
        configuration.publicOrigins.web.href,
        "https://app.auth-workspace.effect-template.localhost/"
      );
      assert.strictEqual(
        configuration.publicOrigins.cookieDomain,
        "auth-workspace.effect-template.localhost"
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
          APP_DOMAIN: "direct.effect-template.localhost",
          APP_ENV: "development",
          BETTER_AUTH_SECRET: "development-secret-at-least-32-characters",
          DATABASE_URL: "postgresql://localhost/direct",
        });

        assert.strictEqual(
          configuration.publicOrigins.api.href,
          "https://api.direct.effect-template.localhost/"
        );
        assert.strictEqual(
          configuration.publicOrigins.web.href,
          "https://app.direct.effect-template.localhost/"
        );
      })
  );

  it.effect("requires a production application domain", () =>
    loadWith({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      DATABASE_URL: "postgresql://production/database",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "APP_DOMAIN");
        })
      )
    )
  );

  it.effect("rejects a short authentication secret", () =>
    loadWith({
      APP_DOMAIN: "direct.effect-template.localhost",
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

  it.effect("rejects an application domain containing a URL", () =>
    loadWith({
      APP_DOMAIN: "https://example.com",
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      DATABASE_URL: "postgresql://production/database",
    }).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          assert.include(String(error), "APP_DOMAIN");
        })
      )
    )
  );

  it.effect("requires email delivery in production", () =>
    loadWith({
      APP_DOMAIN: "example.com",
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "production-secret-at-least-32-characters",
      DATABASE_URL: "postgresql://production/database",
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
      APP_DOMAIN: "direct.effect-template.localhost",
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
