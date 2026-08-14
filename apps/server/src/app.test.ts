import { NodeHttpServer } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { OrganizationAccess } from "@effect-template/core/organization-access";
import { AgentName } from "@effect-template/domain/agent";
import { Principal, UserId } from "@effect-template/domain/identity";
import { OrganizationId } from "@effect-template/domain/organization";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { AuthenticationRpc } from "@effect-template/rpc/authentication";
import { Crypto, Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

import { agentsHandlersLayer } from "./rpc/agents.ts";
import { rpcServerLayer } from "./rpc/server.ts";

const principal = Principal.make({
  userId: UserId.make("123e4567-e89b-42d3-a456-426614174000"),
});
const organizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174001"
);
const authenticationLayer = Layer.succeed(
  AuthenticationRpc.AuthenticationMiddleware,
  AuthenticationRpc.AuthenticationMiddleware.of((effect) =>
    Effect.provideService(effect, AuthenticationRpc.CurrentPrincipal, principal)
  )
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
  Layer.provide(OrganizationAccess.layerAllowAll),
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(cryptoLayer)
);
const serverLayer = rpcServerLayer.pipe(
  Layer.provide(agentsRpcHandlersTestLayer),
  Layer.provide(authenticationLayer)
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
