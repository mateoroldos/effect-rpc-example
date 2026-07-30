import { Agent, AgentId, AgentName } from "@effect-template/core/agent";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

const Operation = Schema.Literals(["create", "get", "list"]);

/** Indicates that an Agent RPC operation could not reach an application dependency. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "AgentsRpc.Unavailable",
  { operation: Operation }
) {}

/** Defines the transport-independent RPC contract for Agent operations. */
export const group = RpcGroup.make(
  Rpc.make("Agents.Create", {
    error: Unavailable,
    payload: Schema.Struct({ name: AgentName }),
    success: Agent,
  }),
  Rpc.make("Agents.Get", {
    error: Schema.Union([AgentDirectory.NotFound, Unavailable]),
    payload: Schema.Struct({ id: AgentId }),
    success: Agent,
  }),
  Rpc.make("Agents.List", {
    error: Unavailable,
    success: Schema.Array(Agent),
  })
);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentsRpc from "./agents-rpc.ts";
