import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import type { AgentId } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { AuthenticationRpc } from "@effect-template/rpc/authentication";
import { Effect, Layer } from "effect";

const annotateAgentId = (id: AgentId) =>
  Effect.annotateCurrentSpan({ "agent.id": id });

/** Agent RPC handlers: translate AgentDirectory results into wire responses. */
export const agentsHandlersLayer = AgentsRpc.group.toLayer(
  Effect.gen(function* makeAgentsRpcHandlers() {
    const directory = yield* AgentDirectory.Service;

    return AgentsRpc.group.of({
      "Agents.Create": Effect.fn("AgentsRpc.create")(function* ({
        name,
        organizationId,
      }) {
        const principal = yield* AuthenticationRpc.CurrentPrincipal;
        return yield* directory
          .create(principal, organizationId, { name })
          .pipe(
            Effect.tap((agent) => annotateAgentId(agent.id)),
            Effect.catchTags({
              "AgentDirectory.IdGenerationError": () =>
                new AgentsRpc.Unavailable(),
              "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
              "OrganizationAccess.NotMember": () => new AgentsRpc.Forbidden(),
              "OrganizationAccess.Unavailable": () =>
                new AgentsRpc.Unavailable(),
            })
          );
      }),
      "Agents.Get": Effect.fn("AgentsRpc.get")(function* ({
        id,
        organizationId,
      }) {
        const principal = yield* AuthenticationRpc.CurrentPrincipal;
        yield* annotateAgentId(id);
        return yield* directory.get(principal, organizationId, id).pipe(
          Effect.catchTags({
            "AgentDirectory.NotFound": () => new AgentsRpc.NotFound({ id }),
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
            "OrganizationAccess.NotMember": () => new AgentsRpc.Forbidden(),
            "OrganizationAccess.Unavailable": () => new AgentsRpc.Unavailable(),
          })
        );
      }),
      "Agents.List": Effect.fn("AgentsRpc.list")(function* ({
        organizationId,
      }) {
        const principal = yield* AuthenticationRpc.CurrentPrincipal;
        return yield* directory.list(principal, organizationId).pipe(
          Effect.tap((agents) =>
            Effect.annotateCurrentSpan({ "result.count": agents.length })
          ),
          Effect.catchTags({
            "AgentStore.PersistenceError": () => new AgentsRpc.Unavailable(),
            "OrganizationAccess.NotMember": () => new AgentsRpc.Forbidden(),
            "OrganizationAccess.Unavailable": () => new AgentsRpc.Unavailable(),
          })
        );
      }),
    });
  })
);

/** Production wiring: handlers backed by PostgreSQL with access policy left open. */
export const agentsHandlersLayerPostgres = agentsHandlersLayer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies),
  Layer.provide(AgentStorePostgres.layer)
);
