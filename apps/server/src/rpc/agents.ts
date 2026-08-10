import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import type { AgentId } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Effect, Layer } from "effect";

const annotateAgentId = (id: AgentId) =>
  Effect.annotateCurrentSpan({ "agent.id": id });

/** Agent RPC handlers: translate AgentDirectory results into wire responses. */
export const agentsHandlersLayer = AgentsRpc.group.toLayer(
  Effect.gen(function* makeAgentsRpcHandlers() {
    const directory = yield* AgentDirectory.Service;

    return AgentsRpc.group.of({
      "Agents.Create": Effect.fn("AgentsRpc.create")((input) =>
        directory.create(input).pipe(
          Effect.tap((agent) => annotateAgentId(agent.id)),
          Effect.catchTags({
            "AgentDirectory.IdGenerationError": () =>
              new AgentsRpc.Unavailable(),
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
          })
        )
      ),
      "Agents.Get": Effect.fn("AgentsRpc.get")(({ id }) =>
        annotateAgentId(id).pipe(
          Effect.andThen(directory.get(id)),
          Effect.catchTags({
            "AgentDirectory.NotFound": () => new AgentsRpc.NotFound({ id }),
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
          })
        )
      ),
      "Agents.List": Effect.fn("AgentsRpc.list")(() =>
        directory.list.pipe(
          Effect.tap((agents) =>
            Effect.annotateCurrentSpan({ "result.count": agents.length })
          ),
          Effect.catchTag(
            "AgentStore.PersistenceError",
            () => new AgentsRpc.Unavailable()
          )
        )
      ),
    });
  })
);

/** Production wiring: handlers backed by the PostgreSQL persistence adapter. */
export const agentsHandlersLayerPostgres = agentsHandlersLayer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies),
  Layer.provide(AgentStorePostgres.layer)
);
