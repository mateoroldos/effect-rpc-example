import { assert, describe, it } from "@effect/vitest";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { Agent, AgentId, AgentName } from "@effect-template/domain/agent";
import { OrganizationId } from "@effect-template/domain/organization";
import { sql } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";

import { organization } from "../../auth/schema.ts";
import { DatabasePostgres } from "../../postgres/index.ts";
import { databasePgliteLayer } from "../../test/database-pglite.ts";
import { AgentStorePostgres } from "./index.ts";

const persistenceLayer = AgentStorePostgres.layer.pipe(
  Layer.provideMerge(databasePgliteLayer)
);
const organizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174001"
);
const otherOrganizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174002"
);
const ada = Agent.make({
  id: AgentId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: AgentName.make("Ada"),
  organizationId,
});
const unknownId = AgentId.make("987e6543-e21b-42d3-a456-426614174000");

const seedOrganization = Effect.fn("AgentStorePostgresTest.seedOrganization")(
  function* (id: OrganizationId, slug: string) {
    const database = yield* DatabasePostgres.Service;
    yield* database.insert(organization).values({
      createdAt: sql`now()`,
      id,
      name: slug,
      slug,
    });
  }
);

describe("PostgreSQL AgentStore", () => {
  it.layer(persistenceLayer)("Organization scope", (test) => {
    test.effect("returns a persisted Agent only in its Organization", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        yield* seedOrganization(organizationId, "acme");
        yield* seedOrganization(otherOrganizationId, "other");
        yield* store.create(ada);
        assert.deepEqual(
          yield* store.find(organizationId, ada.id),
          Option.some(ada)
        );
        assert.deepEqual(
          yield* store.find(otherOrganizationId, ada.id),
          Option.none()
        );
        assert.deepInclude(yield* store.list(organizationId), ada);
        assert.deepEqual(yield* store.list(otherOrganizationId), []);
      })
    );
  });

  it.layer(persistenceLayer)("duplicate identity", (test) => {
    test.effect("returns AgentStore.PersistenceError", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        yield* seedOrganization(organizationId, "acme");
        yield* store.create(ada);
        const error = yield* store.create(ada).pipe(Effect.flip);
        assert.strictEqual(error._tag, "AgentStore.PersistenceError");
      })
    );
  });

  it.layer(persistenceLayer)("missing identity", (test) => {
    test.effect("returns None", () =>
      Effect.gen(function* () {
        const store = yield* AgentStore.Service;
        assert.deepEqual(
          yield* store.find(organizationId, unknownId),
          Option.none()
        );
      })
    );
  });
});
