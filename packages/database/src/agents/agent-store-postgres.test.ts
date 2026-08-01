import { assert, describe, it } from "@effect/vitest";
import { Agent, AgentId, AgentName } from "@effect-template/core/agent";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { Effect, Layer, Option } from "effect";

import { databasePgliteLayer } from "../test/database-pglite.ts";
import { AgentStorePostgres } from "./agent-store-postgres.ts";

const persistenceLayer = AgentStorePostgres.layer.pipe(
  Layer.provide(databasePgliteLayer)
);
const ada = Agent.make({
  id: AgentId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: AgentName.make("Ada"),
});
const unknownId = AgentId.make("987e6543-e21b-42d3-a456-426614174000");

describe("PostgreSQL AgentStore", () => {
  it.layer(persistenceLayer)("create and find", (test) => {
    test.effect("returns a persisted Agent", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        yield* store.create(ada);
        assert.deepEqual(yield* store.find(ada.id), Option.some(ada));
      })
    );
  });

  it.layer(persistenceLayer)("duplicate identity", (test) => {
    test.effect("returns AgentStore.PersistenceError", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        yield* store.create(ada);

        const error = yield* store.create(ada).pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "AgentStore.PersistenceError",
        });
      })
    );
  });

  it.layer(persistenceLayer)("missing identity", (test) => {
    test.effect("returns None", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        assert.deepEqual(yield* store.find(unknownId), Option.none());
      })
    );
  });

  it.layer(persistenceLayer)("listing", (test) => {
    test.effect("returns persisted Agents", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        yield* store.create(ada);
        assert.deepInclude(yield* store.list, ada);
      })
    );
  });
});
