import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { Config, Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { authLayer } from "./auth/layer.ts";
import { effectDatabaseLayer } from "./infra/database.ts";
import { emailLayer } from "./infra/email.ts";
import { PostgresPool } from "./infra/postgres-pool/index.ts";
import { telemetryLayer } from "./infra/telemetry.ts";
import { agentsHandlersLayerPostgres } from "./rpc/agents.ts";
import { rpcServerLayer } from "./rpc/server.ts";

/** Application Layer launched by the Bun server process. */
export const appLayer = rpcServerLayer.pipe(
  Layer.provide(agentsHandlersLayerPostgres),
  Layer.provide(authLayer),
  Layer.provide(effectDatabaseLayer),
  Layer.provide(PostgresPool.layer),
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
