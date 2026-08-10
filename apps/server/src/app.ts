import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { Config, Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { databaseLayer } from "./infra/database.ts";
import { emailLayer } from "./infra/email.ts";
import { telemetryLayer } from "./infra/telemetry.ts";
import { agentsHandlersLayerPostgres } from "./rpc/agents.ts";
import { rpcServerLayer } from "./rpc/server.ts";

/** Application Layer launched by the Bun server process. */
export const appLayer = rpcServerLayer.pipe(
  Layer.provide(agentsHandlersLayerPostgres),
  Layer.provide(databaseLayer),
  Layer.provide(BunCrypto.layer),
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(
    BunHttpServer.layerConfig({
      port: Config.number("PORT").pipe(Config.withDefault(3000)),
    })
  ),
  Layer.provide(telemetryLayer),
  Layer.merge(emailLayer)
);
