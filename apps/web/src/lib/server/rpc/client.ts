import { AppRpc } from "@effect-template/rpc/rpc";
import { Context, Layer } from "effect";
import { RpcClient, type RpcClientError } from "effect/unstable/rpc";

/** The shared schema-aware client for the complete application RPC contract. */
export class AppRpcClient extends Context.Service<
  AppRpcClient,
  RpcClient.FromGroup<typeof AppRpc.group, RpcClientError.RpcClientError>
>()("@effect-template/web/AppRpcClient") {
  /** Builds the client in the lifetime Scope supplied by the web runtime. */
  static readonly layer = Layer.effect(AppRpcClient)(
    RpcClient.make(AppRpc.group)
  );
}
