import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { Config, Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { emailLayer } from "./layers/email.ts";
import { databaseLayer } from "./layers/infrastructure.ts";
import { rpcLayer } from "./layers/rpc.ts";
import { telemetryLayer } from "./layers/telemetry.ts";

/** Application Layer launched by the Bun server process. */
export const appLayer = rpcLayer.pipe(
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
