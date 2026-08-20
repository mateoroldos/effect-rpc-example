import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/node-postgres";

import { makeBetterAuth } from "./better-auth.ts";

/** Better Auth CLI entrypoint. It must remain free of runtime resources and secrets. */
export const auth = makeBetterAuth({
  database: drizzleAdapter(drizzle.mock(), { provider: "pg" }),
});
