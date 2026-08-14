import { Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { RpcGroup, RpcServer } from "effect/unstable/rpc";

import { group as agentsGroup } from "./agents.ts";

const appGroup = RpcGroup.make().merge(agentsGroup);

const protocolLayer = Layer.mergeAll(
  RpcServer.layerProtocolHttp({ path: "/rpc" }),
  HttpRouter.add("GET", "/health", HttpServerResponse.text("ok"))
).pipe(Layer.provide(HttpRouter.layer));

/** HTTP transport for all RPC features; requires their registered handlers. */
export const rpcServerLayer = RpcServer.layer(appGroup).pipe(
  Layer.provideMerge(protocolLayer),
  Layer.provide(HttpRouter.serve(protocolLayer, { disableLogger: true }))
);
