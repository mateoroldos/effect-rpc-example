import { AgentsRpc } from "@effect-template/rpc/agents";
import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { RpcServer } from "effect/unstable/rpc";

import { agentsRpcHandlersLayerPostgres } from "./agents.ts";

const protocolLayer = RpcServer.layerProtocolHttp({ path: "/rpc" }).pipe(
  Layer.provide(HttpRouter.layer)
);

/** HTTP transport preserving its registered RPC handler requirements. */
export const rpcLayerWithoutDependencies = RpcServer.layer(
  AgentsRpc.group
).pipe(
  Layer.provideMerge(protocolLayer),
  Layer.provide(HttpRouter.serve(protocolLayer, { disableLogger: true }))
);

/** HTTP transport serving all production RPC feature handlers. */
export const rpcLayer = rpcLayerWithoutDependencies.pipe(
  Layer.provide(agentsRpcHandlersLayerPostgres)
);
