import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import { AgentsRpcServer } from "@effect-template/rpc/agents/server";
import { Layer } from "effect";

/** Agent RPC handlers preserving requirements. */
export const agentsRpcHandlersLayer = AgentsRpcServer.layer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies)
);

/** Agent RPC handlers backed by the PostgreSQL persistence adapter. */
export const agentsRpcHandlersLayerPostgres = agentsRpcHandlersLayer.pipe(
  Layer.provide(AgentStorePostgres.layer)
);
