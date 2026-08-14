import type { DrizzleAdapterConfig } from "@better-auth/drizzle-adapter/relations-v2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Context, Layer } from "effect";

import {
  type BetterAuthInstance as ConfiguredBetterAuth,
  makeAuth,
  type RuntimeOptions,
} from "../config.ts";

/** Narrow service value owning the one configured Better Auth instance. */
export interface Interface {
  /** Vendor instance used only by Better Auth boundary adapters. */
  readonly auth: ConfiguredBetterAuth;
}

/** Context service for the shared configured Better Auth instance. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/BetterAuthInstance"
) {}

/** Constructs Better Auth from mandatory database, generated schema, and runtime values. */
export const layer = (
  database: NodePgDatabase,
  schema: DrizzleAdapterConfig["schema"],
  runtime: RuntimeOptions
) =>
  Layer.succeed(
    Service,
    Service.of({ auth: makeAuth(database, schema, runtime) })
  );
