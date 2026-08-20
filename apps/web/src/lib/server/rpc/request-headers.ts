import { Effect } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import { tracedForwardedRequestHeaders } from "../better-auth/forwarded-request-headers.ts";

/** Selects safe caller headers and scopes them to one outgoing RPC operation. */
export const withRequestHeaders = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  requestHeaders: Headers,
  trustedOrigin: string
) =>
  Effect.flatMap(
    tracedForwardedRequestHeaders(requestHeaders, trustedOrigin),
    (headers) => RpcClient.withHeaders(effect, headers)
  );
