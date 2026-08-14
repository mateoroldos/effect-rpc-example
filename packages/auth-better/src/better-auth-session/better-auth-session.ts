import { Principal, UserId } from "@effect-template/domain/identity";
import { Context, Effect, Layer, Option, Schema } from "effect";

import { BetterAuthInstance } from "../better-auth-instance/index.ts";

/** Resolves Better Auth sessions into application identity. */
export interface Interface {
  /** Resolves request headers to an optional authenticated Principal. */
  readonly resolvePrincipal: (
    headers: Headers
  ) => Effect.Effect<Option.Option<Principal>, Unavailable | InvalidIdentity>;
}

/** Context service translating Better Auth sessions into domain identity. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/BetterAuthSession"
) {}

/** Constructs BetterAuthSession from the configured Better Auth instance. */
const make = Effect.gen(function* makeBetterAuthSession() {
  const { auth } = yield* BetterAuthInstance.Service;

  const resolvePrincipal = Effect.fn("BetterAuthSession.resolvePrincipal")(
    function* (headers: Headers) {
      const session = yield* Effect.tryPromise({
        catch: (cause) => new Unavailable({ cause }),
        try: () => auth.api.getSession({ headers }),
      });
      if (session === null) {
        return Option.none();
      }
      const userId = yield* Schema.decodeUnknownEffect(UserId)(
        session.user.id
      ).pipe(Effect.mapError(() => new InvalidIdentity()));
      return Option.some(Principal.make({ userId }));
    }
  );

  return Service.of({ resolvePrincipal });
});

/** Provides BetterAuthSession while preserving its BetterAuthInstance requirement. */
export const layerWithoutDependencies = Layer.effect(Service, make);

/** Indicates that the session dependency could not resolve identity. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "BetterAuthSession.Unavailable",
  { cause: Schema.Defect() }
) {}

/** Indicates that persisted session identity violated the domain schema. */
export class InvalidIdentity extends Schema.TaggedErrorClass<InvalidIdentity>()(
  "BetterAuthSession.InvalidIdentity",
  {}
) {}
