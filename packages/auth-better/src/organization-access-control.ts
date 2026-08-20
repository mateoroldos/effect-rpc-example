import {
  type OrganizationPermission,
  type OrganizationRole,
  permissionsByOrganizationRole,
} from "@effect-template/domain/organization";
import { createAccessControl } from "better-auth/plugins";
import {
  defaultRoles,
  defaultStatements,
} from "better-auth/plugins/organization/access";

const statements = {
  ...defaultStatements,
  agent: ["create", "read"],
} as const;

/** Better Auth access control extended with application Organization Permissions. */
export const accessControl = createAccessControl(statements);

/** Translates application Organization Permissions to Better Auth resources and actions. */
export const betterAuthPermissions = {
  "agent:create": { agent: ["create"] },
  "agent:read": { agent: ["read"] },
  "member:invite": { agent: [] },
  "member:read": { agent: [] },
} satisfies Record<
  OrganizationPermission,
  { readonly agent: Array<"create" | "read"> }
>;

/** Better Auth roles configured from the application's Organization role policy. */
export const roles = {
  admin: accessControl.newRole({
    ...defaultRoles.admin.statements,
    ...betterAuthStatementsFor("admin"),
  }),
  member: accessControl.newRole({
    ...defaultRoles.member.statements,
    ...betterAuthStatementsFor("member"),
  }),
  owner: accessControl.newRole({
    ...defaultRoles.owner.statements,
    ...betterAuthStatementsFor("owner"),
  }),
};

function betterAuthStatementsFor(role: OrganizationRole) {
  return {
    agent: permissionsByOrganizationRole[role].flatMap(
      (permission) => betterAuthPermissions[permission].agent
    ),
  };
}
