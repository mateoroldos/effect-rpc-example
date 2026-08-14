import { assert, describe, it } from "@effect/vitest";
import { AgentId, AgentName } from "@effect-template/domain/agent";
import { Crypto, Effect, Layer, PlatformError } from "effect";
import { AgentStore } from "./agent-store/index.ts";
import { AgentDirectory } from "./index.ts";

const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  })
);
const applicationLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(cryptoLayer)
);
const failingCryptoLayer = Layer.succeed(Crypto.Crypto, {
  ...Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  }),
  randomUUIDv4: Effect.fail(
    PlatformError.systemError({
      _tag: "Unknown",
      method: "randomUUIDv4",
      module: "TestCrypto",
    })
  ),
});
const unavailableIdentityLayer = AgentDirectory.layerWithoutDependencies.pipe(
  Layer.provide(AgentStore.layerMemory),
  Layer.provide(failingCryptoLayer)
);

describe("AgentDirectory", () => {
  it.layer(applicationLayer)("create and get", (test) => {
    test.effect("makes a created Agent retrievable", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const created = yield* directory.create({
          name: AgentName.make("Ada"),
        });
        assert.deepEqual(yield* directory.get(created.id), created);
      })
    );
  });

  it.layer(unavailableIdentityLayer)("identity generation failure", (test) => {
    test.effect("returns AgentDirectory.IdGenerationError", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const error = yield* directory
          .create({ name: AgentName.make("Ada") })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "AgentDirectory.IdGenerationError");
      })
    );
  });

  it.layer(applicationLayer)("unknown identity", (test) => {
    test.effect("returns AgentDirectory.NotFound", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const unknownId = AgentId.make("123e4567-e89b-42d3-a456-426614174000");

        const error = yield* directory.get(unknownId).pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "AgentDirectory.NotFound",
          id: unknownId,
        });
      })
    );
  });

  it.layer(applicationLayer)("listing", (test) => {
    test.effect("lists created Agents without relying on order", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const created = yield* directory.create({
          name: AgentName.make("Ada"),
        });
        assert.deepInclude(yield* directory.list, created);
      })
    );
  });
});
