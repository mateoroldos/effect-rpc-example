import {
  type Organization,
  type OrganizationId,
  type OrganizationInvitation,
  OrganizationInvitationId,
  type OrganizationMember,
  type OrganizationName,
  OrganizationRole,
  type OrganizationSlug,
  organizationRoleCanAssign,
} from "@effect-template/domain/organization";
import { Context, Effect, Layer, Schema } from "effect";
import { Authorization } from "../authorization/index.ts";
import { OrganizationProvider } from "./organization-provider/index.ts";

/** Organization operations safe to include in diagnostics. */
export const Operation = Schema.Literals([
  "list",
  "find",
  "create",
  "listPeople",
  "invite",
  "acceptInvitation",
]);

/** Organization operation safe to include in diagnostics. */
export type Operation = typeof Operation.Type;

/** Input for creating an Organization. */
export interface CreateInput {
  readonly name: OrganizationName;
  readonly slug: OrganizationSlug;
}

/** Input for inviting an Organization Member. */
export interface InviteInput {
  readonly email: string;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
}

/** Organization visible to the current Principal and their Role in it. */
export interface VisibleOrganization {
  readonly organization: Organization;
  readonly role: OrganizationRole;
}

/** Members and Invitations visible to the current Principal. */
export interface OrganizationPeople {
  readonly invitations: readonly OrganizationInvitation[];
  readonly members: readonly OrganizationMember[];
}

/** Application operations for maintaining Organizations, Members, and Invitations. */
export interface Interface {
  readonly acceptInvitation: (
    invitationId: OrganizationInvitationId
  ) => Effect.Effect<
    void,
    Authorization.Unauthenticated | InvitationNotFound | Unavailable,
    OrganizationProvider.Service
  >;
  readonly create: (
    input: CreateInput
  ) => Effect.Effect<
    Organization,
    Authorization.Unauthenticated | Conflict | Malformed | Unavailable,
    OrganizationProvider.Service
  >;
  readonly find: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    VisibleOrganization,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Malformed
    | Unavailable,
    OrganizationProvider.Service
  >;
  readonly invite: (
    input: InviteInput
  ) => Effect.Effect<
    void,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Authorization.Unavailable
    | RoleNotAssignable
    | Unavailable,
    Authorization.Service | OrganizationProvider.Service
  >;
  readonly list: Effect.Effect<
    readonly Organization[],
    Authorization.Unauthenticated | Malformed | Unavailable,
    OrganizationProvider.Service
  >;
  readonly listPeople: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    OrganizationPeople,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Authorization.Unavailable
    | Malformed
    | Unavailable,
    Authorization.Service | OrganizationProvider.Service
  >;
}

/**
 * Stable application service for Organization workflows.
 * @effect-expect-leaking Service
 */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/OrganizationDirectory"
) {}

const acceptInvitation = Effect.fn("OrganizationDirectory.acceptInvitation")(
  function* (invitationId: OrganizationInvitationId) {
    const provider = yield* OrganizationProvider.Service;
    return yield* provider.acceptInvitation(invitationId);
  }
);

const create = Effect.fn("OrganizationDirectory.create")(function* (
  input: CreateInput
) {
  const provider = yield* OrganizationProvider.Service;
  return yield* provider.create(input);
});

const find = Effect.fn("OrganizationDirectory.find")(function* (
  organizationId: OrganizationId
) {
  const provider = yield* OrganizationProvider.Service;
  return yield* provider.find(organizationId);
});

const invite = Effect.fn("OrganizationDirectory.invite")(function* (
  input: InviteInput
) {
  const authorization = yield* Authorization.Service;
  const provider = yield* OrganizationProvider.Service;
  const member = yield* authorization.require(
    input.organizationId,
    "member:invite"
  );

  if (!organizationRoleCanAssign(member.role, input.role)) {
    return yield* new RoleNotAssignable({ role: input.role });
  }

  return yield* provider.invite(input);
});

const list = Effect.gen(function* () {
  const provider = yield* OrganizationProvider.Service;
  return yield* provider.list;
}).pipe(Effect.withSpan("OrganizationDirectory.list"));

const listPeople = Effect.fn("OrganizationDirectory.listPeople")(function* (
  organizationId: OrganizationId
) {
  const authorization = yield* Authorization.Service;
  const provider = yield* OrganizationProvider.Service;
  yield* authorization.require(organizationId, "member:read");
  return yield* provider.listPeople(organizationId);
});

/** Provides the stable Organization application workflows. */
export const layer = Layer.succeed(
  Service,
  Service.of({ acceptInvitation, create, find, invite, list, listPeople })
);

/** Indicates that an Organization operation is unavailable. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "OrganizationDirectory.Unavailable",
  { cause: Schema.Defect(), operation: Operation }
) {}

/** Indicates that a provider returned an invalid Organization representation. */
export class Malformed extends Schema.TaggedErrorClass<Malformed>()(
  "OrganizationDirectory.Malformed",
  { operation: Operation }
) {}

/** Indicates that an Organization value is already used. */
export class Conflict extends Schema.TaggedErrorClass<Conflict>()(
  "OrganizationDirectory.Conflict",
  { field: Schema.Literal("slug") }
) {}

/** Indicates that an Invitation is missing or inaccessible to the Principal. */
export class InvitationNotFound extends Schema.TaggedErrorClass<InvitationNotFound>()(
  "OrganizationDirectory.InvitationNotFound",
  { invitationId: OrganizationInvitationId }
) {}

/** Indicates that the current Member cannot assign the requested Role. */
export class RoleNotAssignable extends Schema.TaggedErrorClass<RoleNotAssignable>()(
  "OrganizationDirectory.RoleNotAssignable",
  { role: OrganizationRole }
) {}
