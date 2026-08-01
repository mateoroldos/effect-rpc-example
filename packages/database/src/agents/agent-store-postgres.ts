import { Agent, type AgentId } from "@effect-template/core/agent";
import { AgentStore } from "@effect-template/core/agent-directory/store";
import { eq } from "drizzle-orm";
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { Effect, Layer, Option, Schema } from "effect";

import { DatabasePostgres } from "../postgres.ts";
import { agents } from "./schema.ts";

const decodeAgents = Schema.decodeUnknownEffect(Schema.Array(Agent));

const decodeRows = Effect.fn("AgentStorePostgres.decodeRows")((rows: unknown) =>
  decodeAgents(rows).pipe(Effect.mapError(
    (cause: unknown) => new AgentStore.PersistenceError({ cause })
  ))
);

/** Constructs an AgentStore backed by an acquired Drizzle database. */
const make = (database: EffectPgDatabase): AgentStore.Interface => {
  const create = Effect.fn("AgentStorePostgres.create")((agent: Agent) =>
    database
      .insert(agents)
      .values({ id: agent.id, name: agent.name })
      .pipe(Effect.mapError(
        (cause: unknown) => new AgentStore.PersistenceError({ cause })
      ), Effect.asVoid)
  );

  const find = Effect.fn("AgentStorePostgres.find")(function* (id: AgentId) {
    const rows = yield* database
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1)
      .pipe(Effect.mapError(
        (cause: unknown) => new AgentStore.PersistenceError({ cause })
      ));
    const [agent] = yield* decodeRows(rows);
    return agent === undefined ? Option.none() : Option.some(agent);
  });

  const list = database
    .select()
    .from(agents)
    .pipe(
      Effect.mapError(
        (cause: unknown) => new AgentStore.PersistenceError({ cause })
      ),
      Effect.flatMap(decodeRows),
      Effect.withSpan("AgentStorePostgres.list")
    );

  return AgentStore.Service.of({ create, find, list });
};

/** Provides PostgreSQL-backed Agent persistence. */
export const layer = Layer.effect(
  AgentStore.Service,
  Effect.map(DatabasePostgres.Service, make)
);

// biome-ignore lint/performance/noBarrelFile: Defines the canonical ES module namespace for this leaf module.
export * as AgentStorePostgres from "./agent-store-postgres.ts";
