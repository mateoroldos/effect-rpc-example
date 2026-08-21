import { Layer } from "effect";
import { RpcGroup, RpcServer } from "effect/unstable/rpc";

import { group as agentsGroup } from "./agents.ts";
import { group as organizationsGroup } from "./organizations.ts";

const appGroup = RpcGroup.make().merge(agentsGroup).merge(organizationsGroup);

/** Registers all RPC handlers and their shared HTTP protocol route. */
export const rpcRoutesLayer = RpcServer.layer(appGroup).pipe(
  Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))
);
