import { accessControl, roles } from "./organization-access-control.ts";

/** Better Auth database identity policy shared by schema generation and runtime. */
export const databaseOptions = { generateId: "uuid" as const };

/** Better Auth email/password feature policy shared by schema generation and runtime. */
export const emailAndPasswordPolicy = { enabled: true };

/** Better Auth Organization policy shared by schema generation and runtime. */
export const organizationPolicy = { ac: accessControl, roles };
