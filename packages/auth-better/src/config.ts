import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { createAccessControl, organization } from "better-auth/plugins";
import {
  defaultRoles,
  defaultStatements,
} from "better-auth/plugins/organization/access";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const organizationStatements = {
  ...defaultStatements,
  agent: ["create", "read"],
} as const;

const organizationAccessControl = createAccessControl(
  organizationStatements
);

const organizationRoles = {
  admin: organizationAccessControl.newRole({
    ...defaultRoles.admin.statements,
    agent: ["create", "read"],
  }),
  member: organizationAccessControl.newRole({
    ...defaultRoles.member.statements,
    agent: ["read"],
  }),
  owner: organizationAccessControl.newRole({
    ...defaultRoles.owner.statements,
    agent: ["create", "read"],
  }),
};

/** Schema-affecting Better Auth policy shared by generation and runtime. */
export const schemaOptions = {
  advanced: { database: { generateId: "uuid" as const } },
  emailAndPassword: { enabled: true },
  plugins: [
    organization({ ac: organizationAccessControl, roles: organizationRoles }),
  ],
};

/** Better Auth settings supplied by the deployable composition root. */
export interface RuntimeOptions {
  /** Public URL serving Better Auth HTTP endpoints. */
  readonly baseURL: string;
  /** Secret used to sign and encrypt Better Auth state. */
  readonly secret: string;
}

/** Constructs Better Auth over the supplied Promise-returning Drizzle database. */
export const makeAuth = (
  database: NodePgDatabase,
  schema: DrizzleAdapterConfig["schema"],
  runtime: RuntimeOptions
) =>
  betterAuth({
    ...schemaOptions,
    ...runtime,
    database: drizzleAdapter(database, { provider: "pg", schema }),
  });

/** Configured Better Auth instance shared by its narrow runtime adapters. */
export type BetterAuthInstance = ReturnType<typeof makeAuth>;
