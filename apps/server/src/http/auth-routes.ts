import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
import { Effect, Layer } from "effect";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";

/** Mounts Better Auth's standard HTTP handler under `/api/auth`. */
export const authRoutesLayer = Layer.unwrap(
  Effect.map(BetterAuthHttp.Service, (auth) => {
    const handle = Effect.fn("AuthRoutes.handle")(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      return yield* HttpServerRequest.toWeb(request).pipe(
        Effect.flatMap(auth.handle),
        Effect.map(HttpServerResponse.fromWeb),
        Effect.catchTags({
          "BetterAuthHttp.Unavailable": () =>
            Effect.succeed(HttpServerResponse.empty({ status: 503 })),
          InternalError: () =>
            Effect.succeed(HttpServerResponse.empty({ status: 500 })),
          RequestParseError: () =>
            Effect.succeed(HttpServerResponse.empty({ status: 400 })),
          RouteNotFound: () =>
            Effect.succeed(HttpServerResponse.empty({ status: 404 })),
        })
      );
    });

    return Layer.merge(
      HttpRouter.add("GET", "/api/auth/*", handle()),
      HttpRouter.add("POST", "/api/auth/*", handle())
    );
  })
);
