import { Agent, AgentId, type AgentName } from "@effect-template/domain/agent";
import { Context, Crypto, Effect, Layer, Option, Schema } from "effect";
import { AgentStore } from "./agent-store/index.ts";

/** Application operations for maintaining the directory of known Agents. */
export interface Interface {
  /** Creates and persists an Agent with a generated identity. */
  readonly create: (input: {
    /** Canonical name assigned to the new Agent. */
    readonly name: AgentName;
  }) => Effect.Effect<Agent, IdGenerationError | AgentStore.PersistenceError>;
  /** Retrieves an Agent by identity. */
  readonly get: (
    id: AgentId
  ) => Effect.Effect<Agent, NotFound | AgentStore.PersistenceError>;
  /** Retrieves all known Agents without guaranteeing order. */
  readonly list: Effect.Effect<readonly Agent[], AgentStore.PersistenceError>;
}

/** Context service for the directory of known Agents. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/AgentDirectory"
) {}

/** Constructs AgentDirectory from its persistence and cryptography authorities. */
const make = Effect.gen(function* makeAgentDirectory() {
  const store = yield* AgentStore.Service;
  const crypto = yield* Crypto.Crypto;

  const create = Effect.fn("AgentDirectory.create")(function* (input: {
    readonly name: AgentName;
  }) {
    const uuid = yield* crypto.randomUUIDv4.pipe(
      Effect.mapError((cause) => new IdGenerationError({ cause }))
    );
    const agent = Agent.make({
      id: AgentId.make(uuid),
      name: input.name,
    });
    yield* store.create(agent);
    return agent;
  });

  const get = Effect.fn("AgentDirectory.get")(function* (id: AgentId) {
    const agent = yield* store.find(id);
    return Option.isNone(agent) ? yield* new NotFound({ id }) : agent.value;
  });

  const list = store.list.pipe(Effect.withSpan("AgentDirectory.list"));

  return Service.of({ create, get, list });
});

/** Provides AgentDirectory while preserving its AgentStore and Crypto requirements. */
export const layerWithoutDependencies = Layer.effect(Service, make);

/** Indicates that the requested Agent is absent from the directory. */
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentDirectory.NotFound",
  { id: AgentId }
) {}

/** Indicates that a new Agent identity could not be generated. */
export class IdGenerationError extends Schema.TaggedErrorClass<IdGenerationError>()(
  "AgentDirectory.IdGenerationError",
  { cause: Schema.Defect() }
) {}
