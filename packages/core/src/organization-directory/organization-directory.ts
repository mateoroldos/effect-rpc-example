import {
  type Organization,
  type OrganizationId,
  type OrganizationInvitationId,
  organizationRoleAllows,
  organizationRoleCanAssign,
} from "@effect-template/domain/organization";
import { Context, Effect, Layer } from "effect";
import { Authorization } from "../authorization/index.ts";
import type {
  Conflict,
  CreateInput,
  InvitationNotFound,
  InviteInput,
  Malformed,
  OrganizationPeople,
  Unavailable,
  VisibleOrganization,
} from "./organization-directory-contract.ts";
import { RoleNotAssignable } from "./organization-directory-contract.ts";
import { OrganizationProvider } from "./organization-provider/index.ts";

// biome-ignore lint/performance/noBarrelFile: Keeps the OrganizationDirectory contract behind its canonical module namespace.
export * from "./organization-directory-contract.ts";

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
  const member = yield* authorization.require(organizationId, "member:read");
  const members = yield* provider.listMembers(organizationId);
  if (!organizationRoleAllows(member.role, "member:invite")) {
    return { invitations: [], members };
  }
  const invitations = yield* provider.listInvitations(organizationId);
  return { invitations, members };
});

/** Provides the stable Organization application workflows. */
export const layer = Layer.succeed(
  Service,
  Service.of({ acceptInvitation, create, find, invite, list, listPeople })
);
