import {
  Organization,
  OrganizationId,
  OrganizationInvitation,
  OrganizationInvitationId,
  OrganizationMember,
  OrganizationName,
  OrganizationPermission,
  OrganizationRole,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

/** Indicates that an Organization RPC operation has no authenticated Principal. */
export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "OrganizationsRpc.Unauthenticated",
  {}
) {}

/** Indicates that an Organization RPC dependency is unavailable. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "OrganizationsRpc.Unavailable",
  {}
) {}

/** Indicates that an Organization is missing or inaccessible to the Principal. */
export class OrganizationNotFound extends Schema.TaggedErrorClass<OrganizationNotFound>()(
  "OrganizationsRpc.OrganizationNotFound",
  {}
) {}

/** Indicates that the current Member lacks an Organization Permission. */
export class PermissionDenied extends Schema.TaggedErrorClass<PermissionDenied>()(
  "OrganizationsRpc.PermissionDenied",
  { permission: OrganizationPermission }
) {}

/** Indicates that an Organization cannot be created because a value is already used. */
export class OrganizationConflict extends Schema.TaggedErrorClass<OrganizationConflict>()(
  "OrganizationsRpc.OrganizationConflict",
  { field: Schema.Literal("slug") }
) {}

/** Indicates that an Invitation is missing or inaccessible to the Principal. */
export class InvitationNotFound extends Schema.TaggedErrorClass<InvitationNotFound>()(
  "OrganizationsRpc.InvitationNotFound",
  {}
) {}

/** Indicates that the current Member cannot assign the requested Role. */
export class RoleNotAssignable extends Schema.TaggedErrorClass<RoleNotAssignable>()(
  "OrganizationsRpc.RoleNotAssignable",
  { role: OrganizationRole }
) {}

/** The wire input for finding an Organization. */
export const GetOrganizationInput = Schema.Struct({
  organizationId: OrganizationId,
});
/** Parsed wire input for finding an Organization. */
export type GetOrganizationInput = typeof GetOrganizationInput.Type;

/** The wire input for creating an Organization. */
export const CreateOrganizationInput = Schema.Struct({
  name: OrganizationName,
  slug: OrganizationSlug,
});
/** Parsed wire input for creating an Organization. */
export type CreateOrganizationInput = typeof CreateOrganizationInput.Type;

/** The wire input for listing an Organization's Members and Invitations. */
export const ListOrganizationPeopleInput = Schema.Struct({
  organizationId: OrganizationId,
});
/** Parsed wire input for listing an Organization's Members and Invitations. */
export type ListOrganizationPeopleInput =
  typeof ListOrganizationPeopleInput.Type;

/** The wire input for inviting an Organization Member. */
export const InviteMemberInput = Schema.Struct({
  email: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  ),
  organizationId: OrganizationId,
  role: OrganizationRole,
});
/** Parsed wire input for inviting an Organization Member. */
export type InviteMemberInput = typeof InviteMemberInput.Type;

/** The wire input for accepting an Organization Invitation. */
export const AcceptInvitationInput = Schema.Struct({
  invitationId: OrganizationInvitationId,
});
/** Parsed wire input for accepting an Organization Invitation. */
export type AcceptInvitationInput = typeof AcceptInvitationInput.Type;

const authorizationErrors = [
  OrganizationNotFound,
  PermissionDenied,
  Unavailable,
  Unauthenticated,
] as const;

/** Defines Organization, Member, and Invitation application operations. */
export const group = RpcGroup.make(
  Rpc.make("Organizations.List", {
    error: Schema.Union([Unavailable, Unauthenticated]),
    success: Schema.Array(Organization),
  }),
  Rpc.make("Organizations.Get", {
    error: Schema.Union([OrganizationNotFound, Unavailable, Unauthenticated]),
    payload: GetOrganizationInput,
    success: Schema.Struct({
      organization: Organization,
      role: OrganizationRole,
    }),
  }),
  Rpc.make("Organizations.Create", {
    error: Schema.Union([OrganizationConflict, Unavailable, Unauthenticated]),
    payload: CreateOrganizationInput,
    success: Organization,
  }),
  Rpc.make("Members.List", {
    error: Schema.Union(authorizationErrors),
    payload: ListOrganizationPeopleInput,
    success: Schema.Struct({
      invitations: Schema.Array(OrganizationInvitation),
      members: Schema.Array(OrganizationMember),
    }),
  }),
  Rpc.make("Members.Invite", {
    error: Schema.Union([...authorizationErrors, RoleNotAssignable]),
    payload: InviteMemberInput,
    success: Schema.Void,
  }),
  Rpc.make("Invitations.Accept", {
    error: Schema.Union([InvitationNotFound, Unavailable, Unauthenticated]),
    payload: AcceptInvitationInput,
    success: Schema.Void,
  })
);
