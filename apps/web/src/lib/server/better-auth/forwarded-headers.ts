import { Effect, Option, type Tracer } from "effect";
import { HttpTraceContext } from "effect/unstable/http";
import { webOrigin } from "../../public-origins.ts";

/** Builds the request-scoped headers required by server-side Better Auth calls. */
export const forwardedHeaders = Effect.fn("BetterAuth.forwardedHeaders")(
  function* (requestHeaders: Headers) {
    const headers = new Headers({ origin: webOrigin });
    const cookie = requestHeaders.get("cookie");
    if (cookie !== null) {
      headers.set("cookie", cookie);
    }
    return withTraceContext(headers, yield* Effect.option(Effect.currentSpan));
  }
);

const withTraceContext = (
  headers: Headers,
  span: Option.Option<Tracer.Span>
) => {
  if (Option.isSome(span)) {
    for (const [name, value] of Object.entries(
      HttpTraceContext.toHeaders(span.value)
    )) {
      headers.set(name, value);
    }
  }
  return headers;
};
