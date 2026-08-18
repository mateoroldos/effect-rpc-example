import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { apiOrigin } from "./public-origins.ts";

/** Official Better Auth client for identity and Organization lifecycle operations. */
export const authClient = createAuthClient({
  baseURL: apiOrigin,
  plugins: [organizationClient()],
});
