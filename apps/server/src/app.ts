import { BunCrypto, BunHttpServer } from "@effect/platform-bun";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { OrganizationDirectory } from "@effect-template/core/organization-directory";
import { AgentStorePostgres } from "@effect-template/database/agents/postgres";
import { makeServerLayer } from "@effect-template/observability";
import { Effect, Layer } from "effect";
import { RpcSerialization } from "effect/unstable/rpc";

import { authLayer } from "./auth/layer.ts";
import { load as loadServerConfiguration } from "./config.ts";
import { httpServerLayer } from "./http/server.ts";
import { effectDatabaseLayer } from "./infra/database.ts";
import { emailLayer } from "./infra/email.ts";
import { PostgresPool } from "./infra/postgres-pool/index.ts";
import { agentsHandlersLayer } from "./rpc/agents.ts";
import { organizationsHandlersLayer } from "./rpc/organizations.ts";

const rpcHandlersLayer = Layer.merge(
  agentsHandlersLayer.pipe(
    Layer.provide(AgentDirectory.layerWithoutDependencies),
    Layer.provide(AgentStorePostgres.layer)
  ),
  organizationsHandlersLayer.pipe(Layer.provide(OrganizationDirectory.layer))
);

/** Application Layer launched by the Bun server process. */
export const appLayer = Layer.unwrap(
  Effect.map(loadServerConfiguration, (configuration) =>
    httpServerLayer(configuration.publicOrigins.web.origin).pipe(
      Layer.provide(rpcHandlersLayer),
      Layer.provide(
        authLayer({
          origins: configuration.publicOrigins,
          secret: configuration.authSecret,
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
