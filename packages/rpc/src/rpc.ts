import { RpcGroup } from "effect/unstable/rpc";
import { AgentsRpc } from "./agents/agents-rpc.ts";

/** The complete RPC contract served by the application. */
export const group = RpcGroup.make().merge(AgentsRpc.group);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical application RPC namespace.
export * as AppRpc from "./rpc.ts";
