import { Agent, AgentId, type AgentName } from "@effect-template/domain/agent";
import type { OrganizationId } from "@effect-template/domain/organization";
import { Context, Crypto, Effect, Layer, Option, Schema } from "effect";
import { Authorization } from "../authorization/index.ts";
import { AgentStore } from "./agent-store/index.ts";

/** Application operations for maintaining Organization-owned Agents. */
export interface Interface {
  /** Authorizes, creates, and persists an Agent in an Organization. */
  readonly create: (
    organizationId: OrganizationId,
    input: {
      /** Canonical name assigned to the new Agent. */
      readonly name: AgentName;
    }
  ) => Effect.Effect<
    Agent,
    | IdGenerationError
    | Authorization.Unauthenticated
    | Authorization.Forbidden
    | Authorization.Unavailable
    | AgentStore.PersistenceError,
    Authorization.Service
  >;
  /** Retrieves an Agent after authorizing access to its Organization. */
  readonly get: (
    organizationId: OrganizationId,
    id: AgentId
  ) => Effect.Effect<
    Agent,
    | NotFound
    | Authorization.Unauthenticated
    | Authorization.Forbidden
    | Authorization.Unavailable
    | AgentStore.PersistenceError,
    Authorization.Service
  >;
  /** Retrieves Agents after authorizing access to their Organization. */
  readonly list: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly Agent[],
    | Authorization.Unauthenticated
    | Authorization.Forbidden
    | Authorization.Unavailable
    | AgentStore.PersistenceError,
    Authorization.Service
  >;
}

/**
 * Context service for the directory of Organization-owned Agents.
 * @effect-expect-leaking Service
 */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/AgentDirectory"
) {}

/** Constructs AgentDirectory from persistence and cryptography authorities. */
const make = Effect.gen(function* makeAgentDirectory() {
  const store = yield* AgentStore.Service;
  const crypto = yield* Crypto.Crypto;

  const create = Effect.fn("AgentDirectory.create")(function* (
    organizationId: OrganizationId,
    input: { readonly name: AgentName }
  ) {
    const authorization = yield* Authorization.Service;
    yield* authorization.require(organizationId, "agent:create");
    const uuid = yield* crypto.randomUUIDv4.pipe(
      Effect.mapError((cause) => new IdGenerationError({ cause }))
    );
    const agent = Agent.make({
      id: AgentId.make(uuid),
      name: input.name,
      organizationId,
    });
    yield* store.create(agent);
    return agent;
  });

  const get = Effect.fn("AgentDirectory.get")(function* (
    organizationId: OrganizationId,
    id: AgentId
  ) {
    const authorization = yield* Authorization.Service;
    yield* authorization.require(organizationId, "agent:read");
    const agent = yield* store.find(organizationId, id);
    return Option.isNone(agent) ? yield* new NotFound({ id }) : agent.value;
  });

  const list = Effect.fn("AgentDirectory.list")(function* (
    organizationId: OrganizationId
  ) {
    const authorization = yield* Authorization.Service;
    yield* authorization.require(organizationId, "agent:read");
    return yield* store.list(organizationId);
  });

  return Service.of({ create, get, list });
});

/** Provides AgentDirectory while preserving its AgentStore and Crypto requirements. */
export const layerWithoutDependencies = Layer.effect(Service, make);

/** Indicates that the requested Agent is absent from the scoped directory. */
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentDirectory.NotFound",
  { id: AgentId }
) {}

/** Indicates that a new Agent identity could not be generated. */
export class IdGenerationError extends Schema.TaggedErrorClass<IdGenerationError>()(
  "AgentDirectory.IdGenerationError",
  { cause: Schema.Defect() }
) {}
