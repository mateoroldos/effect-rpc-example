import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
import { BetterAuthSession } from "@effect-template/auth-better/better-auth-session";
import { OrganizationAccessBetterAuth } from "@effect-template/auth-better/organization-access";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { Config, Effect, Layer, Redacted } from "effect";

import { betterAuthDatabase } from "../infra/database.ts";
import { authenticationMiddlewareLayer } from "./rpc-middleware.ts";

const betterAuthInstanceLayer = Layer.unwrap(
  Effect.gen(function* makeBetterAuthInstanceLayer() {
    const database = yield* betterAuthDatabase;
    const baseURL = yield* Config.string("BETTER_AUTH_URL").pipe(
      Config.withDefault("http://localhost:3000")
    );
    const secret = yield* Config.redacted("BETTER_AUTH_SECRET").pipe(
      Config.withDefault(
        Redacted.make("development-secret-at-least-32-characters")
      )
    );
    return BetterAuthInstance.layer(database, authSchema, {
      baseURL,
      secret: Redacted.value(secret),
    });
  })
);

const betterAuthSessionLayer = BetterAuthSession.layerWithoutDependencies.pipe(
  Layer.provide(betterAuthInstanceLayer)
);

const organizationAccessLayer =
  OrganizationAccessBetterAuth.layerWithoutDependencies.pipe(
    Layer.provide(betterAuthInstanceLayer)
  );

const authenticationLayer = authenticationMiddlewareLayer.pipe(
  Layer.provide(betterAuthSessionLayer)
);

/** Authentication and Organization access capabilities for the API server. */
export const authLayer = Layer.merge(
  authenticationLayer,
  organizationAccessLayer
);
