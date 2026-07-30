import { Schema } from "effect";

/** Decodes UUID-v4 strings into branded Agent identities. */
export const AgentId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("AgentId")
);

/** A UUID-v4 identity assigned to an Agent. */
export type AgentId = typeof AgentId.Type;

/** Trims names and accepts values containing 1–200 characters. */
export const AgentName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200)
).pipe(Schema.brand("AgentName"));

/** A trimmed, nonblank Agent name of at most 200 characters. */
export type AgentName = typeof AgentName.Type;

/** Validates Agent records and their domain values. */
export const Agent = Schema.Struct({
  id: AgentId,
  name: AgentName,
});

/** An Agent with a valid identity and canonical name. */
export interface Agent extends Schema.Schema.Type<typeof Agent> {}
