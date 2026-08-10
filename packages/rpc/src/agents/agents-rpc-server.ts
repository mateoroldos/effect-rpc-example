import type { AgentId } from "@effect-template/domain/agent";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { Effect } from "effect";
import { AgentsRpc } from "./agents-rpc.ts";

const annotateAgentId = (id: AgentId) =>
  Effect.annotateCurrentSpan({ "agent.id": id });

/** Provides Agent RPC handlers backed by AgentDirectory.Service. */
export const layer = AgentsRpc.group.toLayer(
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
          Effect.catchTag(
            "AgentStore.PersistenceError",
            () => new AgentsRpc.Unavailable()
          )
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

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentsRpcServer from "./agents-rpc-server.ts";
