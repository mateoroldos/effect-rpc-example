import { User } from "@effect-template/domain/identity";
import { Effect, Option, Schema, type Tracer } from "effect";
import { HttpTraceContext } from "effect/unstable/http";
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
    const span = yield* Effect.option(Effect.currentSpan);
    const { data, error } = yield* Effect.tryPromise({
      catch: (cause) => new Unreachable({ cause }),
      try: (signal) =>
        authClient.getSession({
          fetchOptions: {
            headers: authenticationHeaders(request.headers, span),
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

/**
 * Forwards the session cookie, the trusted web Origin, and the current trace
 * context. Better Auth uses its own fetch, so Effect's HttpClient never gets to
 * propagate the trace itself.
 */
const authenticationHeaders = (
  requestHeaders: Headers,
  span: Option.Option<Tracer.Span>
) => {
  const headers = new Headers({ origin: webOrigin });
  const cookie = requestHeaders.get("cookie");
  if (cookie !== null) {
    headers.set("cookie", cookie);
  }
  if (Option.isSome(span)) {
    for (const [name, value] of Object.entries(
      HttpTraceContext.toHeaders(span.value)
    )) {
      headers.set(name, value);
    }
  }
  return headers;
};
