import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  databaseOptions,
  emailAndPasswordPolicy,
  organizationPolicy,
} from "./config.ts";

/** Better Auth CLI entrypoint. It must remain free of runtime resources and secrets. */
export const auth = betterAuth({
  advanced: { database: databaseOptions },
  database: drizzleAdapter(drizzle.mock(), { provider: "pg" }),
  emailAndPassword: emailAndPasswordPolicy,
  plugins: [organization(organizationPolicy)],
});
