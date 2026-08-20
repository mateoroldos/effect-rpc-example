import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { rpcRoutesLayer } from "../rpc/server.ts";
import { authRoutesLayer } from "./auth-routes.ts";
import { healthRoutesLayer } from "./health-routes.ts";

/** Hosts the independent Better Auth, RPC, and liveness route Layers. */
export const httpServerLayer = (webOrigin: string) =>
  HttpRouter.serve(
    Layer.mergeAll(
      authRoutesLayer,
      healthRoutesLayer,
      rpcRoutesLayer,
      HttpRouter.cors({ allowedOrigins: [webOrigin], credentials: true })
    ).pipe(Layer.provide(HttpRouter.layer)),
    { disableLogger: true }
  );
