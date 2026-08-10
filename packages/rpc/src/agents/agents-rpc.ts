import { Agent, AgentId, AgentName } from "@effect-template/domain/agent";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

/** Indicates that an Agent RPC operation could not reach an application dependency. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "AgentsRpc.Unavailable",
  {}
) {}

/** Indicates that the requested Agent is absent from the directory. */
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentsRpc.NotFound",
  { id: AgentId }
) {}

/** The wire input for creating an Agent. */
export const CreateAgentInput = Schema.Struct({ name: AgentName });
export type CreateAgentInput = typeof CreateAgentInput.Type;

/** The wire input for retrieving an Agent. */
export const GetAgentInput = Schema.Struct({ id: AgentId });
export type GetAgentInput = typeof GetAgentInput.Type;

/** Defines the transport-independent RPC contract for Agent operations. */
export const group = RpcGroup.make(
  Rpc.make("Agents.Create", {
    error: Unavailable,
    payload: CreateAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.Get", {
    error: Schema.Union([NotFound, Unavailable]),
    payload: GetAgentInput,
    success: Agent,
  }),
  Rpc.make("Agents.List", {
    error: Unavailable,
    success: Schema.Array(Agent),
  })
);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentsRpc from "./agents-rpc.ts";
