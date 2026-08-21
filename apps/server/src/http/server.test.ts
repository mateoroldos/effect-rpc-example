import { NodeHttpServer } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { BetterAuthHttp } from "@effect-template/auth-better/better-auth-http";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { Authorization } from "@effect-template/core/authorization";
import { OrganizationDirectory } from "@effect-template/core/organization-directory";
import { OrganizationProvider } from "@effect-template/core/organization-directory/provider";
import { AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Crypto, Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

import { BetterAuthRpc } from "../auth/better-auth-rpc/index.ts";
import { agentsHandlersLayer } from "../rpc/agents.ts";
import { organizationsHandlersLayer } from "../rpc/organizations.ts";
import { httpServerLayer } from "./server.ts";

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
const unavailableService = () =>
  new OrganizationDirectory.Unavailable({
    cause: new Error("Organization service unavailable in Agent-only test"),
    operation: "list",
  });
const organizationsRpcHandlersTestLayer = organizationsHandlersLayer.pipe(
  Layer.provide(OrganizationDirectory.layer)
);
const organizationProvider = OrganizationProvider.Service.of({
  acceptInvitation: () => Effect.fail(unavailableService()),
  create: () => Effect.fail(unavailableService()),
  find: () => Effect.fail(unavailableService()),
  invite: () => Effect.fail(unavailableService()),
  list: Effect.fail(unavailableService()),
  listInvitations: () => Effect.fail(unavailableService()),
  listMembers: () => Effect.fail(unavailableService()),
});
const betterAuthRpcLayer = Layer.succeed(
  BetterAuthRpc.Middleware,
  BetterAuthRpc.Middleware.of((effect) =>
    effect.pipe(
      Effect.provideService(Authorization.Service, Authorization.allowAll),
      Effect.provideService(OrganizationProvider.Service, organizationProvider)
    )
  )
);
const authHttpLayer = Layer.succeed(
  BetterAuthHttp.Service,
  BetterAuthHttp.Service.of({
    handle: () => Effect.succeed(new Response(null, { status: 204 })),
  })
);
const webOrigin = "https://app.example.com";
const serverLayer = httpServerLayer(webOrigin).pipe(
  Layer.provide(
    Layer.merge(agentsRpcHandlersTestLayer, organizationsRpcHandlersTestLayer)
  ),
  Layer.provide(betterAuthRpcLayer),
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

describe("HTTP server", () => {
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

    test.effect("allows credentialed requests from the web origin", () =>
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient;
        const response = yield* http.execute(
          HttpClientRequest.options("/api/auth/sign-in/email").pipe(
            HttpClientRequest.setHeaders({
              "access-control-request-method": "POST",
              origin: webOrigin,
            })
          )
        );
        assert.strictEqual(response.status, 204);
        assert.strictEqual(
          response.headers["access-control-allow-origin"],
          webOrigin
        );
        assert.strictEqual(
          response.headers["access-control-allow-credentials"],
          "true"
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
