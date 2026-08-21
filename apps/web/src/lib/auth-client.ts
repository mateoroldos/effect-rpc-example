import { createAuthClient } from "better-auth/svelte";
import { apiOrigin } from "./public-origins.ts";

/** Official Better Auth client for identity lifecycle operations. */
export const authClient = createAuthClient({ baseURL: apiOrigin });
