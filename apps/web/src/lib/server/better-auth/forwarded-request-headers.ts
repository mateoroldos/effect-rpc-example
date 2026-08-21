import { Effect, Option, type Tracer } from "effect";
import { HttpTraceContext } from "effect/unstable/http";

/** Selects caller credentials and trusted metadata for a downstream request. */
export const forwardedRequestHeaders = (
  requestHeaders: Headers,
  trustedOrigin: string
) => {
  const headers = new Headers({ origin: trustedOrigin });
  const cookie = requestHeaders.get("cookie");
  if (cookie !== null) {
    headers.set("cookie", cookie);
  }
  return headers;
};

/** Adds the current trace context to safe downstream request headers. */
export const tracedForwardedRequestHeaders = Effect.fn(
  "RequestHeaders.forwarded"
)(function* (requestHeaders: Headers, trustedOrigin: string) {
  const headers = forwardedRequestHeaders(requestHeaders, trustedOrigin);
  return withTraceContext(headers, yield* Effect.option(Effect.currentSpan));
});

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
