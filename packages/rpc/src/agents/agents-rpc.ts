import { Agent, AgentId, AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { AuthenticationMiddleware } from "../authentication/authentication-rpc.ts";

/** Indicates that an Agent RPC operation could not reach an application dependency. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "AgentsRpc.Unavailable",
  {}
) {}

/** Indicates that the requested Agent is absent from the scoped directory. */
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentsRpc.NotFound",
  { id: AgentId }
) {}

/** Indicates that the authenticated User cannot access the Organization. */
export class Forbidden extends Schema.TaggedErrorClass<Forbidden>()(
  "AgentsRpc.Forbidden",
  {}
) {}

/** The wire input for creating an Agent. */
export const CreateAgentInput = Schema.Struct({
  name: AgentName,
  organizationId: OrganizationId,
});
export type CreateAgentInput = typeof CreateAgentInput.Type;

/** The wire input for retrieving an Agent. */
export const GetAgentInput = Schema.Struct({
  id: AgentId,
  organizationId: OrganizationId,
});
export type GetAgentInput = typeof GetAgentInput.Type;

/** The wire input selecting an Organization's Agents. */
export const ListAgentsInput = Schema.Struct({
  organizationId: OrganizationId,
});
export type ListAgentsInput = typeof ListAgentsInput.Type;

/** Defines authenticated, Organization-scoped Agent operations. */
export const group = RpcGroup.make(
  Rpc.make("Agents.Create", {
    error: Schema.Union([Forbidden, Unavailable]),
    payload: CreateAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.Get", {
    error: Schema.Union([Forbidden, NotFound, Unavailable]),
    payload: GetAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.List", {
    error: Schema.Union([Forbidden, Unavailable]),
    payload: ListAgentsInput,
    success: Schema.Array(Agent),
  })
).middleware(AuthenticationMiddleware);
