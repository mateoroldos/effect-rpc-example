import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

import { schemaOptions } from "./config.ts";

/** Better Auth CLI entrypoint. It must remain free of runtime resources and secrets. */
export const auth = betterAuth({
  ...schemaOptions,
  database: drizzleAdapter({}, { provider: "pg" }),
});
