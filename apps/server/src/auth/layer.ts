import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { BetterAuthEmail } from "@effect-template/auth-better/better-auth-email";
import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { Effect, Layer, type Redacted } from "effect";
import { betterAuthDatabase } from "../infra/database.ts";
import { AuthorizationRpc } from "./authorization-rpc/index.ts";

export interface Options {
  readonly apiBaseUrl: URL;
  readonly secret: Redacted.Redacted<string>;
  readonly webBaseUrl: URL;
}

const betterAuthInstanceLayer = (options: Options) =>
  Layer.unwrap(
    Effect.gen(function* makeBetterAuthInstanceLayer() {
      const database = yield* betterAuthDatabase;
      return BetterAuthInstance.layerWithoutDependencies({
        baseUrl: options.apiBaseUrl,
        database,
        schema: authSchema,
        secret: options.secret,
        trustedOrigins: [options.webBaseUrl.origin],
      }).pipe(
        Layer.provide(
          BetterAuthEmail.layerWithoutDependencies({
            webBaseUrl: options.webBaseUrl,
          })
        )
      );
    })
  );

const authorizationRpcLayer = AuthorizationRpc.layer.pipe(
  Layer.provide(AuthorizationBetterAuth.layerWithoutDependencies)
);

/** Better Auth HTTP and request authorization capabilities for the server. */
export const authLayer = (options: Options) =>
  Layer.merge(
    BetterAuthHttp.layerWithoutDependencies,
    authorizationRpcLayer
  ).pipe(Layer.provide(betterAuthInstanceLayer(options)));
