import { AgentDirectory } from "@effect-template/core/agent-directory";
import { Effect } from "effect";

import { AgentsRpc } from "./agents-rpc.ts";

/** Provides Agent RPC handlers backed by AgentDirectory.Service. */
export const layer = AgentsRpc.group.toLayer(
  Effect.gen(function* makeAgentsRpcHandlers() {
    const directory = yield* AgentDirectory.Service;

    return AgentsRpc.group.of({
      "Agents.Create": Effect.fn("AgentsRpc.create")((input) =>
        directory.create(input).pipe(
          Effect.catchTags({
            "AgentDirectory.IdGenerationError": () =>
              new AgentsRpc.Unavailable({ operation: "create" }),
            "AgentStore.PersistenceError": () =>
              new AgentsRpc.Unavailable({ operation: "create" }),
          })
        )
      ),
      "Agents.Get": Effect.fn("AgentsRpc.get")(({ id }) =>
        directory
          .get(id)
          .pipe(
            Effect.catchTag(
              "AgentStore.PersistenceError",
              () => new AgentsRpc.Unavailable({ operation: "get" })
            )
          )
      ),
      "Agents.List": Effect.fn("AgentsRpc.list")(() =>
        directory.list.pipe(
          Effect.catchTag(
            "AgentStore.PersistenceError",
            () => new AgentsRpc.Unavailable({ operation: "list" })
          )
        )
      ),
    });
  })
);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentsRpcServer from "./agents-rpc-server.ts";
