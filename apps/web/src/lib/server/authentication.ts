import { User } from "@effect-template/domain/identity";
import { Effect, Option, Schema } from "effect";
import { authClient } from "$lib/auth-client.ts";
import { webOrigin } from "$lib/public-origins.ts";

/** Indicates that the identity provider could not resolve the request session. */
class Unreachable extends Schema.TaggedErrorClass<Unreachable>()(
  "Authentication.Unreachable",
  { cause: Schema.Defect() }
) {}

/** Indicates that a persisted identity does not satisfy the domain User contract. */
class MalformedIdentity extends Schema.TaggedErrorClass<MalformedIdentity>()(
  "Authentication.MalformedIdentity",
  {}
) {}

const decodeUser = Schema.decodeUnknownOption(User);

/** Resolves a request cookie into the safe authenticated User used by SvelteKit. */
export const resolveAuthentication = Effect.fn("Authentication.resolve")(
  function* (request: Request) {
    const { data, error } = yield* Effect.tryPromise({
      catch: (cause) => new Unreachable({ cause }),
      try: (signal) =>
        authClient.getSession({
          fetchOptions: {
            headers: authenticationHeaders(request.headers),
            signal,
          },
        }),
    });
    if (error) {
      return yield* new Unreachable({ cause: error });
    }
    if (!data) {
      return Option.none<User>();
    }
    const user = decodeUser(data.user);
    if (Option.isNone(user)) {
      return yield* new MalformedIdentity();
    }
    return user;
  }
);

const authenticationHeaders = (requestHeaders: Headers) => {
  const headers = new Headers({ origin: webOrigin });
  const cookie = requestHeaders.get("cookie");
  if (cookie !== null) {
    headers.set("cookie", cookie);
  }
  return headers;
};
