import { NodeHttpServer } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { AgentName } from "@effect-template/core/agent";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Crypto, Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

import { agentsRpcHandlersLayer } from "./layers/agents.ts";
import { rpcLayerWithoutDependencies } from "./layers/rpc.ts";

const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  })
);
const agentsRpcHandlersTestLayer = agentsRpcHandlersLayer.pipe(
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(cryptoLayer)
);
const serverLayer = rpcLayerWithoutDependencies.pipe(
  Layer.provide(agentsRpcHandlersTestLayer)
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
        });

        assert.deepEqual(
          yield* client["Agents.Get"]({ id: created.id }),
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
