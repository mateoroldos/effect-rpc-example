import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
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

const authorizationRpcLayer = AuthorizationRpc.layer.pipe(
  Layer.provide(AuthorizationBetterAuth.layerWithoutDependencies)
);

/** Better Auth HTTP and request authorization capabilities for the server. */
export const authLayer = Layer.merge(
  BetterAuthHttp.layerWithoutDependencies,
  authorizationRpcLayer
).pipe(Layer.provide(betterAuthInstanceLayer));
