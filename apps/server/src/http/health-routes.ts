import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

/** Liveness route independent of authentication and application handlers. */
export const healthRoutesLayer = HttpRouter.add(
  "GET",
  "/health",
  HttpServerResponse.text("ok")
);
