import { assert, describe, it } from "@effect/vitest";
import { AgentId, AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { Crypto, Effect, Layer, PlatformError } from "effect";
import { Authorization } from "../authorization/index.ts";
import { AgentStore } from "./agent-store/index.ts";
import { AgentDirectory } from "./index.ts";

const organizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174001"
);
const otherOrganizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174002"
);
const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    digest: (_algorithm, data) => Effect.succeed(data),
    randomBytes: (size) => new Uint8Array(size),
  })
);
const applicationLayer = Layer.merge(
  AgentDirectory.layerWithoutDependencies.pipe(
    Layer.provide(AgentStore.layerMemory),
    Layer.provide(cryptoLayer)
  ),
  Authorization.layerAllowAll
);
const deniedAuthorizationLayer = Layer.succeed(
  Authorization.Service,
  Authorization.Service.of({
    require: (requestedOrganizationId, permission) =>
      Effect.fail(
        new Authorization.PermissionDenied({
          organizationId: requestedOrganizationId,
          permission,
        })
      ),
  })
);
const deniedApplicationLayer = Layer.merge(
  AgentDirectory.layerWithoutDependencies.pipe(
    Layer.provide(AgentStore.layerMemory),
    Layer.provide(cryptoLayer)
  ),
  deniedAuthorizationLayer
);
const readOnlyApplicationLayer = Layer.merge(
  AgentDirectory.layerWithoutDependencies.pipe(
    Layer.provide(AgentStore.layerMemory),
    Layer.provide(cryptoLayer)
  ),
  Layer.succeed(
    Authorization.Service,
    Authorization.Service.of({
      require: (requestedOrganizationId, permission) =>
        permission === "agent:read"
          ? Effect.succeed({
              organizationId: requestedOrganizationId,
              role: "member" as const,
            })
          : Effect.fail(
              new Authorization.PermissionDenied({
                organizationId: requestedOrganizationId,
                permission,
              })
            ),
    })
  )
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
const unavailableIdentityLayer = Layer.merge(
  AgentDirectory.layerWithoutDependencies.pipe(
    Layer.provide(AgentStore.layerMemory),
    Layer.provide(failingCryptoLayer)
  ),
  Authorization.layerAllowAll
);

describe("AgentDirectory", () => {
  it.layer(applicationLayer)("Organization member", (test) => {
    test.effect("creates and retrieves an Agent in the same Organization", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const created = yield* directory.create(organizationId, {
          name: AgentName.make("Ada"),
        });
        assert.deepEqual(
          yield* directory.get(organizationId, created.id),
          created
        );
      })
    );
  });

  it.layer(applicationLayer)("Organization isolation", (test) => {
    test.effect("never returns another Organization's Agents", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const created = yield* directory.create(organizationId, {
          name: AgentName.make("Ada"),
        });
        assert.deepEqual(yield* directory.list(otherOrganizationId), []);
        const error = yield* directory
          .get(otherOrganizationId, created.id)
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "AgentDirectory.NotFound");
      })
    );
  });

  it.layer(readOnlyApplicationLayer)("permission selection", (test) => {
    test.effect("requires create separately from read", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        assert.deepEqual(yield* directory.list(organizationId), []);
        const error = yield* directory
          .create(organizationId, { name: AgentName.make("Ada") })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "Authorization.PermissionDenied");
      })
    );
  });

  it.layer(deniedApplicationLayer)("denied permissions", (test) => {
    test.effect("rejects access before creating an Agent", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const error = yield* directory
          .create(organizationId, { name: AgentName.make("Ada") })
          .pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "Authorization.PermissionDenied",
          organizationId,
        });
      })
    );

    test.effect("rejects access before retrieving an Agent", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const error = yield* directory
          .get(
            organizationId,
            AgentId.make("123e4567-e89b-42d3-a456-426614174003")
          )
          .pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "Authorization.PermissionDenied",
          organizationId,
        });
      })
    );

    test.effect("rejects access before listing Agents", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const error = yield* directory.list(organizationId).pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "Authorization.PermissionDenied",
          organizationId,
        });
      })
    );
  });

  it.layer(unavailableIdentityLayer)("identity generation failure", (test) => {
    test.effect("returns AgentDirectory.IdGenerationError", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const error = yield* directory
          .create(organizationId, { name: AgentName.make("Ada") })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "AgentDirectory.IdGenerationError");
      })
    );
  });

  it.layer(applicationLayer)("unknown identity", (test) => {
    test.effect("returns AgentDirectory.NotFound", () =>
      Effect.gen(function* () {
        const directory = yield* AgentDirectory.Service;
        const unknownId = AgentId.make("123e4567-e89b-42d3-a456-426614174003");
        const error = yield* directory
          .get(organizationId, unknownId)
          .pipe(Effect.flip);
        assert.deepInclude(error, {
          _tag: "AgentDirectory.NotFound",
          id: unknownId,
        });
      })
    );
  });
});
