import type { Agent } from "@effect-template/core/agent";

/** A persisted Agent or the temporary row shown while creation is in flight. */
export type AgentListItem =
  | { readonly _tag: "Persisted"; readonly agent: Agent }
  | { readonly _tag: "Creating"; readonly name: string };
