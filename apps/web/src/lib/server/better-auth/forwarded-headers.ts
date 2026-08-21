import { webOrigin } from "../../public-origins.ts";
import { tracedForwardedRequestHeaders } from "./forwarded-request-headers.ts";

/** Builds the request-scoped headers required by server-side Better Auth calls. */
export const forwardedHeaders = (requestHeaders: Headers) =>
  tracedForwardedRequestHeaders(requestHeaders, webOrigin);
