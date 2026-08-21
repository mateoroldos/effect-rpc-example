import {
  type Organization,
  type OrganizationId,
  type OrganizationInvitation,
  OrganizationInvitationId,
  type OrganizationMember,
  type OrganizationName,
  OrganizationRole,
  type OrganizationSlug,
} from "@effect-template/domain/organization";
import { Schema } from "effect";

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
