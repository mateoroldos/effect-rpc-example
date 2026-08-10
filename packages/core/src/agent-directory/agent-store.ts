import type { Agent, AgentId } from "@effect-template/domain/agent";
import { Context, Effect, Layer, Option, Ref, Schema } from "effect";

/** Persistence authority required by the Agent Directory. */
export interface Interface {
  /** Persists a new Agent, failing when its identity already exists. */
  readonly create: (agent: Agent) => Effect.Effect<void, PersistenceError>;
  /** Finds a persisted Agent by identity. */
  readonly find: (
    id: AgentId
  ) => Effect.Effect<Option.Option<Agent>, PersistenceError>;
  /** Retrieves all persisted Agents without guaranteeing order. */
  readonly list: Effect.Effect<readonly Agent[], PersistenceError>;
}

/** Context service for Agent persistence. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/AgentStore"
) {}

/** Indicates that Agent persistence failed. */
export class PersistenceError extends Schema.TaggedErrorClass<PersistenceError>()(
  "AgentStore.PersistenceError",
  { cause: Schema.Defect() }
) {}

/** Provides isolated in-memory Agent persistence for tests. */
export const layerMemory = Layer.effect(
  Service,
  Effect.gen(function* makeAgentStoreMemory() {
    const state = yield* Ref.make<ReadonlyMap<AgentId, Agent>>(new Map());

    const create = Effect.fn("AgentStoreMemory.create")(function* (
      agent: Agent
    ) {
      const inserted = yield* Ref.modify(state, (agents) => {
        if (agents.has(agent.id)) {
          return [false, agents];
        }
        const next = new Map(agents);
        next.set(agent.id, agent);
        return [true, next];
      });
      if (!inserted) {
        return yield* new PersistenceError({
          cause: new Error("Agent identity already exists"),
        });
      }
    });

    const find = Effect.fn("AgentStoreMemory.find")(function* (id: AgentId) {
      const agent = (yield* Ref.get(state)).get(id);
      return agent === undefined ? Option.none() : Option.some(agent);
    });

    const list = Ref.get(state).pipe(
      Effect.map((agents) => Array.from(agents.values())),
      Effect.withSpan("AgentStoreMemory.list")
    );

    return Service.of({ create, find, list });
  })
);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentStore from "./agent-store.ts";
