import { Agent, AgentId, type AgentName } from "@effect-template/domain/agent";
import type { Principal } from "@effect-template/domain/identity";
import type { OrganizationId } from "@effect-template/domain/organization";
import { Context, Crypto, Effect, Layer, Option, Schema } from "effect";
import { OrganizationAccess } from "../organization-access/index.ts";
import { AgentStore } from "./agent-store/index.ts";

/** Application operations for maintaining Organization-owned Agents. */
export interface Interface {
  /** Authorizes, creates, and persists an Agent in an Organization. */
  readonly create: (
    principal: Principal,
    organizationId: OrganizationId,
    input: {
      /** Canonical name assigned to the new Agent. */
      readonly name: AgentName;
    }
  ) => Effect.Effect<
    Agent,
    | IdGenerationError
    | OrganizationAccess.NotMember
    | OrganizationAccess.Unavailable
    | AgentStore.PersistenceError
  >;
  /** Retrieves an Agent after authorizing access to its Organization. */
  readonly get: (
    principal: Principal,
    organizationId: OrganizationId,
    id: AgentId
  ) => Effect.Effect<
    Agent,
    | NotFound
    | OrganizationAccess.NotMember
    | OrganizationAccess.Unavailable
    | AgentStore.PersistenceError
  >;
  /** Retrieves Agents after authorizing access to their Organization. */
  readonly list: (
    principal: Principal,
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly Agent[],
    | OrganizationAccess.NotMember
    | OrganizationAccess.Unavailable
    | AgentStore.PersistenceError
  >;
}

/** Context service for the directory of Organization-owned Agents. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/AgentDirectory"
) {}

/** Constructs AgentDirectory from authorization, persistence, and cryptography authorities. */
const make = Effect.gen(function* makeAgentDirectory() {
  const access = yield* OrganizationAccess.Service;
  const store = yield* AgentStore.Service;
  const crypto = yield* Crypto.Crypto;

  const create = Effect.fn("AgentDirectory.create")(function* (
    principal: Principal,
    organizationId: OrganizationId,
    input: { readonly name: AgentName }
  ) {
    yield* access.requireMember(principal, organizationId);
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
    principal: Principal,
    organizationId: OrganizationId,
    id: AgentId
  ) {
    yield* access.requireMember(principal, organizationId);
    const agent = yield* store.find(organizationId, id);
    return Option.isNone(agent) ? yield* new NotFound({ id }) : agent.value;
  });

  const list = Effect.fn("AgentDirectory.list")(function* (
    principal: Principal,
    organizationId: OrganizationId
  ) {
    yield* access.requireMember(principal, organizationId);
    return yield* store.list(organizationId);
  });

  return Service.of({ create, get, list });
});

/** Provides AgentDirectory while preserving its authorization, AgentStore, and Crypto requirements. */
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
