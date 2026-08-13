import { organization } from "better-auth/plugins";

/** Organization plugin policy shared by generation and the runtime adapter. */
const organizationOptions = {};

/** Schema-affecting Better Auth policy shared by generation and runtime. */
export const schemaOptions = {
  advanced: { database: { generateId: "uuid" as const } },
  emailAndPassword: { enabled: true },
  plugins: [organization(organizationOptions)],
};
