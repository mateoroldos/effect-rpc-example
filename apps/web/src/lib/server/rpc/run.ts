import { error } from "@sveltejs/kit";
import { Effect, Filter, Result } from "effect";
import type { RpcClientError } from "effect/unstable/rpc";
import { getRequestEvent } from "$app/server";
import { webOrigin } from "../../public-origins.ts";
import { AppRpcClient } from "../rpc/client.ts";
import { run } from "../runtime.ts";
import { withRequestHeaders } from "./request-headers.ts";

/** Runs an RPC operation and projects its typed failures at the SvelteKit boundary. */
export const runRpc = <A, E extends { readonly _tag: string }>(
  operation: (
    client: AppRpcClient["Service"]
  ) => Effect.Effect<A, E | RpcClientError.RpcClientError, never>,
  onFailure: (error: NoInfer<E>) => never
): Promise<A> => {
  const { request } = getRequestEvent();
  return run(
    withRequestHeaders(
      Effect.flatMap(AppRpcClient, operation),
      request.headers,
      webOrigin
    ),
    (failure) =>
      Result.match(Filter.tagged("RpcClientError")(failure), {
        onFailure,
        onSuccess: () => error(503, "The application is unavailable"),
      }),
    { signal: request.signal }
  );
};
