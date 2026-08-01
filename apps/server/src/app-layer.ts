import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { databaseLayer } from "./layers/infrastructure.ts";
import { rpcLayer } from "./layers/rpc.ts";
import { telemetryLayer } from "./layers/telemetry.ts";

/** Application Layer launched by the Bun server process. */
export const appLayer = rpcLayer.pipe(
  Layer.provide(databaseLayer),
  Layer.provide(BunCrypto.layer),
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(BunHttpServer.layer({ port: 3000 })),
  Layer.provide(telemetryLayer)
);
