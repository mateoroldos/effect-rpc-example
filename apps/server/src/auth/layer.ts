import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { Config, Effect, Layer, Redacted } from "effect";

import { betterAuthDatabase } from "../infra/database.ts";
import { AuthorizationRpc } from "./authorization-rpc/index.ts";

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

const betterAuthAuthorizationLayer =
  AuthorizationBetterAuth.layerWithoutDependencies.pipe(
    Layer.provide(betterAuthInstanceLayer)
  );

/** Better Auth-backed Organization authorization for server RPC handlers. */
export const authLayer = AuthorizationRpc.layer.pipe(
  Layer.provide(betterAuthAuthorizationLayer)
);
