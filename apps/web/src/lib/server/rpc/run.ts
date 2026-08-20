import { error } from "@sveltejs/kit";
import { Effect, Filter, Result } from "effect";
import type { RpcClientError } from "effect/unstable/rpc";
import { getRequestEvent } from "$app/server";
import { AppRpcClient } from "../rpc/client.ts";
import { run } from "../runtime.ts";

/** Runs an RPC operation and projects its typed failures at the SvelteKit boundary. */
export const runRpc = <A, E extends { readonly _tag: string }>(
  operation: (
    client: AppRpcClient["Service"]
  ) => Effect.Effect<A, E | RpcClientError.RpcClientError, never>,
  onFailure: (error: NoInfer<E>) => never
): Promise<A> => {
  const {
    request: { signal },
  } = getRequestEvent();
  return run(
    Effect.flatMap(AppRpcClient, operation),
    (failure) =>
      Result.match(Filter.tagged("RpcClientError")(failure), {
        onFailure,
        onSuccess: () => error(503, "The application is unavailable"),
      }),
    { signal }
  );
};
