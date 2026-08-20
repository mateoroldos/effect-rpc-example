import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { Authorization } from "@effect-template/core/authorization";
import { Effect, Layer, Schema } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";

/** Supplies Organization authorization to server-side RPC handlers. */
export class Middleware extends RpcMiddleware.Service<
  Middleware,
  { provides: Authorization.Service }
>()("@effect-template/server/AuthorizationRpc.Middleware", {
  error: Schema.Never,
  requiredForClient: false,
}) {}

/** Provides RPC Organization authorization backed by Better Auth credentials. */
export const layer = Layer.effect(
  Middleware,
  Effect.gen(function* makeAuthorizationRpc() {
    const authorization = yield* AuthorizationBetterAuth.Service;

    return Middleware.of(
      Effect.fn("AuthorizationRpc.provide")(function* (effect, { headers }) {
        return yield* Effect.provideService(
          effect,
          Authorization.Service,
          Authorization.Service.of({
            require: (organizationId, permission) =>
              authorization.require(
                new Headers(headers),
                organizationId,
                permission
              ),
          })
        );
      })
    );
  })
);

/** Provides allow-all Organization authorization for focused RPC tests. */
export const layerAllowAll = Layer.succeed(
  Middleware,
  Middleware.of((effect) =>
    Effect.provideService(effect, Authorization.Service, Authorization.allowAll)
  )
);

/** Provides unauthenticated Organization authorization for RPC projection tests. */
export const layerUnauthenticated = Layer.succeed(
  Middleware,
  Middleware.of((effect) =>
    Effect.provideService(
      effect,
      Authorization.Service,
      Authorization.unauthenticated
    )
  )
);
