import { assert, describe, it } from "@effect/vitest";
import { AgentDirectory } from "@effect-template/core/agent-directory";
import {
  AgentStore,
  layerMemory,
} from "@effect-template/core/agent-directory/store";
import { AgentId, AgentName } from "@effect-template/domain/agent";
import { AgentsRpc } from "@effect-template/rpc/agents";
import { Crypto, Effect, Layer } from "effect";
import { RpcTest } from "effect/unstable/rpc";
import { agentsHandlersLayer } from "./agents.ts";

const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  })
);
const availableDirectoryLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(layerMemory),
  Layer.provide(cryptoLayer)
);
const availableLayer = agentsHandlersLayer.pipe(
  Layer.provide(availableDirectoryLayer)
);
const persistenceFailure = () =>
  new AgentStore.PersistenceError({
    cause: new Error("private database details"),
  });
const unavailableStore: AgentStore.Interface = {
  create: () => Effect.fail(persistenceFailure()),
  find: () => Effect.fail(persistenceFailure()),
  list: Effect.fail(persistenceFailure()),
};
const unavailableDirectoryLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(
    Layer.succeed(AgentStore.Service, AgentStore.Service.of(unavailableStore))
  ),
  Layer.provide(cryptoLayer)
);
const unavailableLayer = agentsHandlersLayer.pipe(
  Layer.provide(unavailableDirectoryLayer)
);

const unknownId = AgentId.make("123e4567-e89b-42d3-a456-426614174000");

describe("agents RPC", () => {
  it.layer(availableLayer)("available persistence", (test) => {
    test.effect("round-trips create, get, and list", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(AgentsRpc.group);
          const created = yield* client["Agents.Create"]({
            name: AgentName.make("Ada"),
          });
          assert.deepEqual(
            yield* client["Agents.Get"]({ id: created.id }),
            created
          );
          assert.deepInclude(yield* client["Agents.List"](), created);
        })
      )
    );

    test.effect("projects a missing Agent to AgentsRpc.NotFound", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(AgentsRpc.group);
          const error = yield* client["Agents.Get"]({ id: unknownId }).pipe(
            Effect.flip
          );

          assert.deepInclude(error, {
            _tag: "AgentsRpc.NotFound",
            id: unknownId,
          });
        })
      )
    );
  });

  it.layer(unavailableLayer)("unavailable persistence", (test) => {
    test.effect("projects persistence failures to Unavailable", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(AgentsRpc.group);
          const createError = yield* client["Agents.Create"]({
            name: AgentName.make("Ada"),
          }).pipe(Effect.flip);
          const getError = yield* client["Agents.Get"]({ id: unknownId }).pipe(
            Effect.flip
          );
          const listError = yield* client["Agents.List"]().pipe(Effect.flip);

          assert.deepEqual(createError, new AgentsRpc.Unavailable());
          assert.deepEqual(getError, new AgentsRpc.Unavailable());
          assert.deepEqual(listError, new AgentsRpc.Unavailable());
        })
      )
    );
  });
});
