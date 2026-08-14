import { BetterAuthSession } from "@effect-template/auth-better/better-auth-session";
import { AuthenticationRpc } from "@effect-template/rpc/authentication";
import { Effect, Layer, Option } from "effect";

/** Provides RPC authentication through Better Auth session cookies. */
export const authenticationMiddlewareLayer = Layer.effect(
  AuthenticationRpc.AuthenticationMiddleware,
  Effect.gen(function* makeAuthenticationMiddleware() {
    const session = yield* BetterAuthSession.Service;

    return AuthenticationRpc.AuthenticationMiddleware.of(
      Effect.fn("AuthenticationMiddleware.authenticate")(function* (
        effect,
        { headers }
      ) {
        const principal = yield* session
          .resolvePrincipal(new Headers(headers))
          .pipe(
            Effect.mapError(() => new AuthenticationRpc.Unavailable()),
            Effect.flatMap(
              Option.match({
                onNone: () =>
                  Effect.fail(new AuthenticationRpc.Unauthenticated()),
                onSome: Effect.succeed,
              })
            )
          );
        return yield* Effect.provideService(
          effect,
          AuthenticationRpc.CurrentPrincipal,
          principal
        );
      })
    );
  })
);
