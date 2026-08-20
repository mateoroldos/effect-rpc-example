import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { rpcRoutesLayer } from "../rpc/server.ts";
import { authRoutesLayer } from "./auth-routes.ts";
import { healthRoutesLayer } from "./health-routes.ts";

const routesLayer = Layer.mergeAll(
  authRoutesLayer,
  healthRoutesLayer,
  rpcRoutesLayer
).pipe(Layer.provide(HttpRouter.layer));

/** Hosts the independent Better Auth, RPC, and liveness route Layers. */
export const httpServerLayer = HttpRouter.serve(routesLayer, {
  disableLogger: true,
});
