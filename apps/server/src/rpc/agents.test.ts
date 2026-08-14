import { assert, describe, it } from "@effect/vitest";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { AgentId, AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Crypto, Effect, Layer } from "effect";
import { RpcTest } from "effect/unstable/rpc";
import { AuthorizationRpc } from "../auth/authorization-rpc/index.ts";
import { group as agentsGroup, agentsHandlersLayer } from "./agents.ts";

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
const availableDirectoryLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(cryptoLayer)
);
const availableLayer = agentsHandlersLayer.pipe(
  Layer.provide(availableDirectoryLayer),
  Layer.merge(AuthorizationRpc.layerAllowAll)
);
const persistenceFailure = () =>
  new AgentStore.PersistenceError({
    cause: new Error("private database details"),
  });
const unavailableStore: AgentStore.Interface = {
  create: () => Effect.fail(persistenceFailure()),
  find: () => Effect.fail(persistenceFailure()),
  list: () => Effect.fail(persistenceFailure()),
};
const unavailableDirectoryLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(
    Layer.succeed(AgentStore.Service, AgentStore.Service.of(unavailableStore))
  ),
  Layer.provide(cryptoLayer)
);
const unavailableLayer = agentsHandlersLayer.pipe(
  Layer.provide(unavailableDirectoryLayer),
  Layer.merge(AuthorizationRpc.layerAllowAll)
);
const unauthenticatedLayer = agentsHandlersLayer.pipe(
  Layer.provide(availableDirectoryLayer),
  Layer.merge(AuthorizationRpc.layerUnauthenticated)
);

const unknownId = AgentId.make("123e4567-e89b-42d3-a456-426614174002");

describe("agents RPC", () => {
  it.layer(availableLayer)("available persistence", (test) => {
    test.effect("round-trips create, get, and list", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(agentsGroup);
          const created = yield* client["Agents.Create"]({
            name: AgentName.make("Ada"),
            organizationId,
          });
          assert.deepEqual(
            yield* client["Agents.Get"]({ id: created.id, organizationId }),
            created
          );
          assert.deepInclude(
            yield* client["Agents.List"]({ organizationId }),
            created
          );
        })
      )
    );

    test.effect("projects a missing Agent to AgentsRpc.NotFound", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(agentsGroup);
          const error = yield* client["Agents.Get"]({
            id: unknownId,
            organizationId,
          }).pipe(Effect.flip);
          assert.deepInclude(error, {
            _tag: "AgentsRpc.NotFound",
            id: unknownId,
          });
        })
      )
    );
  });

  it.layer(unauthenticatedLayer)("missing session", (test) => {
    test.effect("rejects within the Agent operation", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(agentsGroup);
          const error = yield* client["Agents.List"]({ organizationId }).pipe(
            Effect.flip
          );
          assert.deepEqual(error, new AgentsRpc.Unauthenticated());
        })
      )
    );
  });

  it.layer(unavailableLayer)("unavailable persistence", (test) => {
    test.effect("projects persistence failures to Unavailable", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(agentsGroup);
          const createError = yield* client["Agents.Create"]({
            name: AgentName.make("Ada"),
            organizationId,
          }).pipe(Effect.flip);
          const getError = yield* client["Agents.Get"]({
            id: unknownId,
            organizationId,
          }).pipe(Effect.flip);
          const listError = yield* client["Agents.List"]({
            organizationId,
          }).pipe(Effect.flip);

          assert.deepEqual(createError, new AgentsRpc.Unavailable());
          assert.deepEqual(getError, new AgentsRpc.Unavailable());
          assert.deepEqual(listError, new AgentsRpc.Unavailable());
        })
      )
    );
  });
});
