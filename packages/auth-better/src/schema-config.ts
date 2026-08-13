import { betterAuth } from "better-auth";

import { schemaOptions } from "./config.ts";

/** Better Auth CLI entrypoint. It must remain free of runtime resources and secrets. */
export const auth = betterAuth(schemaOptions);
