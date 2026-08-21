import { Schema } from "effect";
import { User } from "../identity/identity.ts";

/** Decodes UUID-v4 strings into branded Organization identities. */
export const OrganizationId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("OrganizationId")
);

/** A UUID-v4 identity assigned to an Organization by Better Auth. */
export type OrganizationId = typeof OrganizationId.Type;

/** Trims Organization names and accepts values containing 1–200 characters. */
export const OrganizationName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200)
).pipe(Schema.brand("OrganizationName"));

/** A trimmed, nonblank Organization name of at most 200 characters. */
export type OrganizationName = typeof OrganizationName.Type;

/** Accepts lowercase URL-safe Organization slugs without leading or trailing separators. */
export const OrganizationSlug = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(255),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
).pipe(Schema.brand("OrganizationSlug"));

/** A lowercase URL-safe Organization navigation slug. */
export type OrganizationSlug = typeof OrganizationSlug.Type;

/** Accepts the application roles assignable to an Organization Member. */
export const OrganizationRole = Schema.Literals(["owner", "admin", "member"]);

/** An application role assigned to an Organization Member. */
export type OrganizationRole = typeof OrganizationRole.Type;

/** Application capabilities that can be granted within an Organization. */
export const OrganizationPermission = Schema.Literals([
  "agent:create",
  "agent:read",
  "member:invite",
  "member:read",
]);

/** An application capability granted through an Organization role. */
export type OrganizationPermission = typeof OrganizationPermission.Type;

/** Application permissions granted by each Organization Role. */
export const permissionsByOrganizationRole = {
  admin: ["agent:create", "agent:read", "member:invite", "member:read"],
  member: ["agent:read", "member:read"],
  owner: ["agent:create", "agent:read", "member:invite", "member:read"],
} as const satisfies Readonly<
  Record<OrganizationRole, readonly OrganizationPermission[]>
>;

/** Returns whether an Organization Role grants an Organization Permission. */
export const organizationRoleAllows = (
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean =>
  permissionsByOrganizationRole[role].some((granted) => granted === permission);

/** Roles that each Organization Role may assign through an Invitation. */
export const assignableRolesByOrganizationRole = {
  admin: ["member"],
  member: [],
  owner: ["admin", "member"],
} as const satisfies Readonly<
  Record<OrganizationRole, readonly OrganizationRole[]>
>;

/** Returns whether an Organization Role may assign another Role. */
export const organizationRoleCanAssign = (
  callerRole: OrganizationRole,
  assignedRole: OrganizationRole
): boolean =>
  assignableRolesByOrganizationRole[callerRole].some(
    (role: OrganizationRole) => role === assignedRole
  );

/** Decodes UUID-v4 strings into branded Organization invitation identities. */
export const OrganizationInvitationId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("OrganizationInvitationId")
);

/** A UUID-v4 identity assigned to an Organization invitation. */
export type OrganizationInvitationId = typeof OrganizationInvitationId.Type;

/** A User and role belonging to an Organization. */
export const OrganizationMember = Schema.Struct({
  role: OrganizationRole,
  user: User,
});

/** A safe Organization Member projection. */
export interface OrganizationMember
  extends Schema.Schema.Type<typeof OrganizationMember> {}

/** A pending invitation visible to Organization administrators. */
export const OrganizationInvitation = Schema.Struct({
  email: Schema.String,
  id: OrganizationInvitationId,
  role: OrganizationRole,
  status: Schema.Literals(["pending", "accepted", "rejected", "canceled"]),
});

/** A safe pending Organization invitation projection. */
export interface OrganizationInvitation
  extends Schema.Schema.Type<typeof OrganizationInvitation> {}

/** Validates Organization records and their domain values. */
export const Organization = Schema.Struct({
  id: OrganizationId,
  name: OrganizationName,
  slug: OrganizationSlug,
});

/** An Organization with a stable identity, canonical name, and navigation slug. */
export interface Organization extends Schema.Schema.Type<typeof Organization> {}
