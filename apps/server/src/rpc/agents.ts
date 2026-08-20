import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import type { AgentId } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Effect, Layer } from "effect";

import { AuthorizationRpc } from "../auth/authorization-rpc/index.ts";

/** Agent RPC contract decorated with the server's authorization context. */
export const group = AgentsRpc.group.middleware(AuthorizationRpc.Middleware);

const annotateAgentId = (id: AgentId) =>
  Effect.annotateCurrentSpan({ "agent.id": id });

/** Agent RPC handlers: translate AgentDirectory results into wire responses. */
export const agentsHandlersLayer = group.toLayer(
  Effect.gen(function* makeAgentsRpcHandlers() {
    const directory = yield* AgentDirectory.Service;

    return group.of({
      "Agents.Create": Effect.fn("AgentsRpc.create")(function* ({
        name,
        organizationId,
      }) {
        return yield* directory.create(organizationId, { name }).pipe(
          Effect.tap((agent) => annotateAgentId(agent.id)),
          Effect.catchTags({
            "AgentDirectory.IdGenerationError": () =>
              new AgentsRpc.Unavailable(),
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
            "Authorization.Forbidden": () => new AgentsRpc.Forbidden(),
            "Authorization.Unauthenticated": () =>
              new AgentsRpc.Unauthenticated(),
            "Authorization.Unavailable": () => new AgentsRpc.Unavailable(),
          })
        );
      }),
      "Agents.Get": Effect.fn("AgentsRpc.get")(function* ({
        id,
        organizationId,
      }) {
        yield* annotateAgentId(id);
        return yield* directory.get(organizationId, id).pipe(
          Effect.catchTags({
            "AgentDirectory.NotFound": () => new AgentsRpc.NotFound({ id }),
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
            "Authorization.Forbidden": () => new AgentsRpc.Forbidden(),
            "Authorization.Unauthenticated": () =>
              new AgentsRpc.Unauthenticated(),
            "Authorization.Unavailable": () => new AgentsRpc.Unavailable(),
          })
        );
      }),
      "Agents.List": Effect.fn("AgentsRpc.list")(function* ({
        organizationId,
      }) {
        return yield* directory.list(organizationId).pipe(
          Effect.tap((agents) =>
            Effect.annotateCurrentSpan({ "result.count": agents.length })
          ),
          Effect.catchTags({
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
            "Authorization.Forbidden": () => new AgentsRpc.Forbidden(),
            "Authorization.Unauthenticated": () =>
              new AgentsRpc.Unauthenticated(),
            "Authorization.Unavailable": () => new AgentsRpc.Unavailable(),
          })
        );
      }),
    });
  })
);

/** Production wiring: handlers backed by PostgreSQL with authorization left open. */
export const agentsHandlersLayerPostgres = agentsHandlersLayer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies),
  Layer.provide(AgentStorePostgres.layer)
);
