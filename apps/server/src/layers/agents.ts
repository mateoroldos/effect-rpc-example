import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import { Layer } from "effect";
import { agentsRpcServerLayer } from "./agents-rpc-server.ts";

/** Agent RPC handlers preserving requirements. */
export const agentsRpcHandlersLayer = agentsRpcServerLayer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies)
);

/** Agent RPC handlers backed by the PostgreSQL persistence adapter. */
export const agentsRpcHandlersLayerPostgres = agentsRpcHandlersLayer.pipe(
  Layer.provide(AgentStorePostgres.layer)
);
