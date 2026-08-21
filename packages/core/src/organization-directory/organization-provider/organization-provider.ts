import type { EmailAddress } from "@effect-template/domain/email-address";
import {
  type Organization,
  type OrganizationId,
  type OrganizationInvitation,
  OrganizationInvitationId,
  type OrganizationMember,
  type OrganizationName,
  type OrganizationRole,
  type OrganizationSlug,
} from "@effect-template/domain/organization";
import { Context, type Effect, Schema } from "effect";
import type { Authorization } from "../../authorization/index.ts";

/** Organization provider operations safe to include in diagnostics. */
export const Operation = Schema.Literals([
  "list",
  "find",
  "create",
  "listPeople",
  "invite",
  "acceptInvitation",
]);

/** Organization provider operation safe to include in diagnostics. */
export type Operation = typeof Operation.Type;

/** Input required by a provider to create an Organization. */
export interface CreateInput {
  readonly name: OrganizationName;
  readonly slug: OrganizationSlug;
}

/** Input required by a provider to invite an Organization Member. */
export interface InviteInput {
  readonly email: EmailAddress;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
}

/** Organization resolved by a provider together with the Principal's Role. */
export interface VisibleOrganization {
  readonly organization: Organization;
  readonly role: OrganizationRole;
}

/** Indicates that an Organization provider operation is unavailable. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "OrganizationProvider.Unavailable",
  { cause: Schema.Defect(), operation: Operation }
) {}

/** Indicates that a provider returned an invalid Organization representation. */
export class Malformed extends Schema.TaggedErrorClass<Malformed>()(
  "OrganizationProvider.Malformed",
  { operation: Operation }
) {}

/** Indicates that an Organization value is already used by the provider. */
export class Conflict extends Schema.TaggedErrorClass<Conflict>()(
  "OrganizationProvider.Conflict",
  { field: Schema.Literal("slug") }
) {}

/** Indicates that an Invitation is missing or inaccessible at the provider. */
export class InvitationNotFound extends Schema.TaggedErrorClass<InvitationNotFound>()(
  "OrganizationProvider.InvitationNotFound",
  { invitationId: OrganizationInvitationId }
) {}

/** Request-bound Organization operations implemented by an external provider. */
export interface Interface {
  readonly acceptInvitation: (
    invitationId: OrganizationInvitationId
  ) => Effect.Effect<
    void,
    Authorization.Unauthenticated | InvitationNotFound | Unavailable
  >;
  readonly create: (
    input: CreateInput
  ) => Effect.Effect<
    Organization,
    Authorization.Unauthenticated | Conflict | Malformed | Unavailable
  >;
  readonly find: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    VisibleOrganization,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Malformed
    | Unavailable
  >;
  readonly invite: (
    input: InviteInput
  ) => Effect.Effect<
    void,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Unavailable
  >;
  readonly list: Effect.Effect<
    readonly Organization[],
    Authorization.Unauthenticated | Malformed | Unavailable
  >;
  readonly listInvitations: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly OrganizationInvitation[],
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Malformed
    | Unavailable
  >;
  readonly listMembers: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly OrganizationMember[],
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Malformed
    | Unavailable
  >;
}

/** External Organization provider bound to the current request. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/OrganizationDirectory/Provider"
) {}
