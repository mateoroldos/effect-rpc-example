import type { Agent } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { error } from "@sveltejs/kit";
import { Match, Schema } from "effect";
import { form, query, requested } from "$app/server";
import type { AgentListItem } from "../features/agents/agent-list-item.ts";
import { runRpc } from "../server/remotes/rpc.ts";

const persistedAgent = (agent: Agent): AgentListItem => ({
  _tag: "Persisted",
  agent,
});

export const getAgents = query(async (): Promise<readonly AgentListItem[]> => {
  const agents = await runRpc(
    (client) => client["Agents.List"](),
    (failure) =>
      Match.value(failure).pipe(
        Match.tagsExhaustive({
          "AgentsRpc.Unavailable": () =>
            error(503, "The Agents service is unavailable"),
        })
      )
  );
  return agents.map(persistedAgent);
});

export const createAgent = form(
  Schema.toStandardSchemaV1(AgentsRpc.CreateAgentInput),
  async ({ name }) => {
    await runRpc(
      (client) => client["Agents.Create"]({ name }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "AgentsRpc.Unavailable": () =>
              error(503, "The Agents service is unavailable"),
          })
        )
    );

    await requested(getAgents, 1).refreshAll();
  }
);
