import { Agent, AgentId, AgentName } from "@effect-template/domain/agent";
import {
  OrganizationId,
  OrganizationPermission,
} from "@effect-template/domain/organization";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

/** Indicates that an Agent RPC operation has no authenticated session. */
export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "AgentsRpc.Unauthenticated",
  {}
) {}

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

/** Indicates that the requested Organization is not visible to the Principal. */
export class OrganizationNotFound extends Schema.TaggedErrorClass<OrganizationNotFound>()(
  "AgentsRpc.OrganizationNotFound",
  {}
) {}

/** Indicates that the current Member lacks an Organization Permission. */
export class PermissionDenied extends Schema.TaggedErrorClass<PermissionDenied>()(
  "AgentsRpc.PermissionDenied",
  { permission: OrganizationPermission }
) {}

/** The wire input for creating an Agent. */
export const CreateAgentInput = Schema.Struct({
  name: AgentName,
  organizationId: OrganizationId,
});
/** Parsed wire input for creating an Agent. */
export type CreateAgentInput = typeof CreateAgentInput.Type;

/** The wire input for retrieving an Agent. */
export const GetAgentInput = Schema.Struct({
  id: AgentId,
  organizationId: OrganizationId,
});
/** Parsed wire input for retrieving an Agent. */
export type GetAgentInput = typeof GetAgentInput.Type;

/** The wire input selecting an Organization's Agents. */
export const ListAgentsInput = Schema.Struct({
  organizationId: OrganizationId,
});
/** Parsed wire input selecting an Organization's Agents. */
export type ListAgentsInput = typeof ListAgentsInput.Type;

const authorizationErrors = [
  OrganizationNotFound,
  PermissionDenied,
  Unavailable,
  Unauthenticated,
] as const;

/** Defines authenticated, Organization-scoped Agent operations. */
export const group = RpcGroup.make(
  Rpc.make("Agents.Create", {
    error: Schema.Union(authorizationErrors),
    payload: CreateAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.Get", {
    error: Schema.Union([...authorizationErrors, NotFound]),
    payload: GetAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.List", {
    error: Schema.Union(authorizationErrors),
    payload: ListAgentsInput,
    success: Schema.Array(Agent),
  })
);
