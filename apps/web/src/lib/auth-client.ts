import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { apiUrl } from "./api-url.ts";

/** Official Better Auth client for identity and Organization lifecycle operations. */
export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [organizationClient()],
});
