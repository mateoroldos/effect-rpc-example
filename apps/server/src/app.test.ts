import { NodeHttpServer } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Crypto, Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

import { AuthorizationRpc } from "./auth/authorization-rpc/index.ts";
import { httpServerLayer } from "./http/server.ts";
import { agentsHandlersLayer } from "./rpc/agents.ts";

const organizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174001"
);
const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  })
);
const agentsRpcHandlersTestLayer = agentsHandlersLayer.pipe(
  Layer.provide(AgentDirectory.layerWithoutDependencies),
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(cryptoLayer)
);
const authHttpLayer = Layer.succeed(
  BetterAuthHttp.Service,
  BetterAuthHttp.Service.of({
    handle: () => Effect.succeed(new Response(null, { status: 204 })),
  })
);
const serverLayer = httpServerLayer.pipe(
  Layer.provide(agentsRpcHandlersTestLayer),
  Layer.provide(AuthorizationRpc.layerAllowAll),
  Layer.provide(authHttpLayer)
);
const clientProtocolLayer = RpcClient.layerProtocolHttp({
  transformClient: HttpClient.mapRequest(HttpClientRequest.appendUrl("/rpc")),
  url: "",
});
const endToEndLayer = Layer.merge(serverLayer, clientProtocolLayer).pipe(
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provideMerge(NodeHttpServer.layerTest)
);

describe("server", () => {
  it.layer(endToEndLayer)("HTTP RPC", (test) => {
    test.effect("creates and retrieves an Agent", () =>
      Effect.gen(function* () {
        const client = yield* RpcClient.make(AgentsRpc.group);
        const created = yield* client["Agents.Create"]({
          name: AgentName.make("Ada"),
          organizationId,
        });

        assert.deepEqual(
          yield* client["Agents.Get"]({ id: created.id, organizationId }),
          created
        );
      })
    );

    test.effect("delegates public auth routes to Better Auth", () =>
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient;
        const response = yield* http.get("/api/auth/session");
        assert.strictEqual(response.status, 204);
      })
    );

    test.effect("serves the liveness probe", () =>
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient;
        const response = yield* http.get("/health");
        assert.strictEqual(response.status, 200);
        assert.strictEqual(yield* response.text, "ok");
      })
    );
  });
});
