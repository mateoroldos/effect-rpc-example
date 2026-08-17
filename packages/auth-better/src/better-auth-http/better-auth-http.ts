import { Context, Effect, Layer, Schema } from "effect";

import { BetterAuthInstance } from "../better-auth-instance/index.ts";

/** Standard HTTP boundary for the configured Better Auth instance. */
export interface Interface {
  /** Handles one Better Auth request. */
  readonly handle: (request: Request) => Effect.Effect<Response, Unavailable>;
}

/** Context service exposing Better Auth through standard HTTP values. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/BetterAuthHttp"
) {}

const make = Effect.gen(function* makeBetterAuthHttp() {
  const { auth } = yield* BetterAuthInstance.Service;

  const handle = Effect.fn("BetterAuthHttp.handle")((request: Request) =>
    Effect.tryPromise({
      catch: (cause) => new Unavailable({ cause }),
      try: () => auth.handler(request),
    })
  );

  return Service.of({ handle });
});

/** Provides BetterAuthHttp while leaving the configured instance requirement open. */
export const layerWithoutDependencies = Layer.effect(Service, make);

/** Indicates that Better Auth could not complete an HTTP request. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "BetterAuthHttp.Unavailable",
  { cause: Schema.Defect() }
) {}
