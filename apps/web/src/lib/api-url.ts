import { API_URL, DEV_INSTANCE } from "$app/env/public";

/** Public API origin used by browser and server-side web adapters. */
export const apiUrl = requireApiUrl(API_URL, DEV_INSTANCE);

function requireApiUrl(
  configuredUrl: string | undefined,
  devInstance: string | undefined
) {
  if (configuredUrl !== undefined) {
    return configuredUrl;
  }
  if (devInstance !== undefined) {
    return `https://${devInstance}.api.effect-template.localhost`;
  }
  throw new Error("API_URL is required when DEV_INSTANCE is not configured");
}
