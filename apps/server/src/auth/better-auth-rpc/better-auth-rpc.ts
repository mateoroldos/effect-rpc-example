import { OrganizationBetterAuth } from "@effect-template/auth-better/organization";
import { Authorization } from "@effect-template/core/authorization";
import { OrganizationProvider } from "@effect-template/core/organization-directory/provider";
import { Effect, Layer, Schema } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";

/** Supplies Better Auth Organization capabilities to server-side RPC handlers. */
export class Middleware extends RpcMiddleware.Service<
  Middleware,
  { provides: Authorization.Service | OrganizationProvider.Service }
>()("@effect-template/server/BetterAuthRpc.Middleware", {
  error: Schema.Never,
  requiredForClient: false,
}) {}

/** Binds Authorization and OrganizationProvider to the current RPC request. */
export const layer = Layer.effect(
  Middleware,
  Effect.gen(function* makeBetterAuthRpc() {
    const betterAuth = yield* OrganizationBetterAuth.Service;

    return Middleware.of(
      Effect.fn("BetterAuthRpc.provide")(function* (effect, { headers }) {
        const capabilities = betterAuth.forHeaders(new Headers(headers));
        return yield* effect.pipe(
          Effect.provideService(
            Authorization.Service,
            capabilities.authorization
          ),
          Effect.provideService(
            OrganizationProvider.Service,
            capabilities.organizations
          )
        );
      })
    );
  })
);
