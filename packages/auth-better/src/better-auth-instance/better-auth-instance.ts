import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, Redacted } from "effect";

import { BetterAuthEmail } from "../better-auth-email/index.ts";
import {
  databaseOptions,
  emailAndPasswordPolicy,
  organizationPolicy,
} from "../config.ts";

/** Parsed values required to construct Better Auth. */
export interface Options {
  readonly baseUrl: URL;
  readonly database: NodePgDatabase;
  readonly schema: DrizzleAdapterConfig["schema"];
  readonly secret: Redacted.Redacted<string>;
  readonly trustedOrigins: string[];
}

const make = ({ baseUrl, database, schema, secret, trustedOrigins }: Options) =>
  Effect.gen(function* makeBetterAuthInstance() {
    const email = yield* BetterAuthEmail.Service;
    const runPromise = Effect.runPromiseWith(yield* Effect.context<never>());

    return {
      auth: betterAuth({
        advanced: { database: databaseOptions },
        baseURL: baseUrl.toString(),
        database: drizzleAdapter(database, { provider: "pg", schema }),
        emailAndPassword: {
          ...emailAndPasswordPolicy,
          sendResetPassword: ({ user, url }) =>
            runPromise(email.sendPasswordReset(user.email, url)),
        },
        emailVerification: {
          sendOnSignUp: true,
          sendVerificationEmail: ({ user, url }) =>
            runPromise(email.sendVerification(user.email, url)),
        },
        plugins: [
          organization({
            ...organizationPolicy,
            sendInvitationEmail: ({ email: recipient, id }) =>
              runPromise(email.sendInvitation(recipient, id)),
          }),
        ],
        secret: Redacted.value(secret),
        trustedOrigins,
      }),
    };
  });

/** Narrow service value owning the one configured Better Auth instance. */
export interface Interface extends Effect.Success<ReturnType<typeof make>> {}

/** Context service for the shared configured Better Auth instance. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/BetterAuthInstance"
) {}

/** Constructs Better Auth while preserving its BetterAuthEmail requirement. */
export const layerWithoutDependencies = (options: Options) =>
  Layer.effect(Service, make(options));
