import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { makeServerLayer } from "@effect-template/observability";
import { Effect, Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { authLayer } from "./auth/layer.ts";
import { load as loadServerConfiguration } from "./config.ts";
import { httpServerLayer } from "./http/server.ts";
import { effectDatabaseLayer } from "./infra/database.ts";
import { emailLayer } from "./infra/email.ts";
import { PostgresPool } from "./infra/postgres-pool/index.ts";
import { agentsHandlersLayerPostgres } from "./rpc/agents.ts";

/** Application Layer launched by the Bun server process. */
export const appLayer = Layer.unwrap(
  Effect.map(loadServerConfiguration, (configuration) =>
    httpServerLayer.pipe(
      Layer.provide(agentsHandlersLayerPostgres),
      Layer.provide(
        authLayer({
          apiBaseUrl: configuration.apiBaseUrl,
          secret: configuration.authSecret,
          webBaseUrl: configuration.webBaseUrl,
        })
      ),
      Layer.provide(effectDatabaseLayer),
      Layer.provide(PostgresPool.layer(configuration.databaseUrl)),
      Layer.provide(BunCrypto.layer),
      Layer.provide(RpcSerialization.layerNdjson),
      Layer.provide(BunHttpServer.layer({ port: configuration.httpPort })),
      Layer.provide(makeServerLayer(configuration.telemetry)),
      Layer.provide(emailLayer(configuration.email))
    )
  )
);
