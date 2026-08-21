import type { Agent } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { error } from "@sveltejs/kit";
import { Match, Schema } from "effect";
import { form, query, requested } from "$app/server";
import type { AgentListItem } from "../features/agents/agent-list-item.ts";
import { runRpc } from "../server/rpc/run.ts";

const persistedAgent = (agent: Agent): AgentListItem => ({
  _tag: "Persisted",
  agent,
});

export const getAgents = query(
  Schema.toStandardSchemaV1(AgentsRpc.ListAgentsInput),
  async ({ organizationId }): Promise<readonly AgentListItem[]> => {
    const agents = await runRpc(
      (client) => client["Agents.List"]({ organizationId }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "AgentsRpc.OrganizationNotFound": () =>
              error(404, "Organization not found"),
            "AgentsRpc.PermissionDenied": () =>
              error(403, "You do not have permission to view Agents."),
            "AgentsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "AgentsRpc.Unavailable": () =>
              error(503, "Agents could not be loaded. Try again later."),
          })
        )
    );
    return agents.map(persistedAgent);
  }
);

export const createAgent = form(
  Schema.toStandardSchemaV1(AgentsRpc.CreateAgentInput),
  async ({ name, organizationId }) => {
    await runRpc(
      (client) => client["Agents.Create"]({ name, organizationId }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "AgentsRpc.OrganizationNotFound": () =>
              error(404, "Organization not found"),
            "AgentsRpc.PermissionDenied": () =>
              error(403, "You do not have permission to create Agents."),
            "AgentsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "AgentsRpc.Unavailable": () =>
              error(503, "The Agent could not be created. Try again later."),
          })
        )
    );
    await requested(getAgents, 1).refreshAll();
  }
);
