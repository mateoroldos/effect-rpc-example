import { AppRpc } from "@effect-template/rpc/rpc";
import { Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { RpcServer } from "effect/unstable/rpc";

const protocolLayer = Layer.mergeAll(
  RpcServer.layerProtocolHttp({ path: "/rpc" }),
  HttpRouter.add("GET", "/health", HttpServerResponse.text("ok"))
).pipe(Layer.provide(HttpRouter.layer));

/** HTTP transport for all RPC features; requires their registered handlers. */
export const rpcServerLayer = RpcServer.layer(AppRpc.group).pipe(
  Layer.provideMerge(protocolLayer),
  Layer.provide(HttpRouter.serve(protocolLayer, { disableLogger: true }))
);
