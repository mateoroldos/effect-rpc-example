import { APP_DOMAIN } from "$app/env/public";

/** Public API origin shared by the authentication and RPC clients. */
export const apiOrigin = `https://api.${APP_DOMAIN}`;

/** Trusted browser origin sent with server-side authentication requests. */
export const webOrigin = `https://app.${APP_DOMAIN}`;
