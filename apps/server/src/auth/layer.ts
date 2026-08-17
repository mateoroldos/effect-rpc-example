import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { BetterAuthEmail } from "@effect-template/auth-better/better-auth-email";
import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { Config, Effect, Layer } from "effect";

import { betterAuthDatabase } from "../infra/database.ts";
import { AuthorizationRpc } from "./authorization-rpc/index.ts";

const betterAuthInstanceLayer = Layer.unwrap(
  Effect.gen(function* makeBetterAuthInstanceLayer() {
    const database = yield* betterAuthDatabase;
    const emailLayer = BetterAuthEmail.layerWithoutDependencies({
      webBaseUrl: yield* Config.url("WEB_URL"),
    });
    return BetterAuthInstance.layerWithoutDependencies({
      baseUrl: yield* Config.url("BETTER_AUTH_URL"),
      database,
      schema: authSchema,
      secret: yield* Config.redacted("BETTER_AUTH_SECRET"),
    }).pipe(Layer.provide(emailLayer));
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
