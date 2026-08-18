import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "@better-auth/drizzle-adapter/relations-v2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, Redacted } from "effect";

import { makeBetterAuth } from "../better-auth.ts";
import { BetterAuthEmail } from "../better-auth-email/index.ts";

/** Parsed values required to construct Better Auth. */
export interface Options {
  readonly baseUrl: URL;
  readonly cookieDomain: string;
  readonly database: NodePgDatabase;
  readonly schema: DrizzleAdapterConfig["schema"];
  readonly secret: Redacted.Redacted<string>;
  readonly webBaseUrl: URL;
}

const make = ({
  baseUrl,
  cookieDomain,
  database,
  schema,
  secret,
  webBaseUrl,
}: Options) =>
  Effect.gen(function* makeBetterAuthInstance() {
    const email = yield* BetterAuthEmail.Service;
    const runPromise = Effect.runPromiseWith(yield* Effect.context<never>());

    return {
      auth: makeBetterAuth({
        advanced: {
          crossSubDomainCookies: { domain: cookieDomain, enabled: true },
          useSecureCookies: true,
        },
        baseURL: baseUrl.toString(),
        database: drizzleAdapter(database, { provider: "pg", schema }),
        emailAndPassword: {
          enabled: true,
          sendResetPassword: ({ user, url }) =>
            runPromise(email.sendPasswordReset(user.email, url)),
        },
        emailVerification: {
          sendOnSignUp: true,
          sendVerificationEmail: ({ user, url }) =>
            runPromise(email.sendVerification(user.email, url)),
        },
        organization: {
          sendInvitationEmail: ({ email: recipient, id }) =>
            runPromise(email.sendInvitation(recipient, id)),
        },
        secret: Redacted.value(secret),
        trustedOrigins: [webBaseUrl.origin],
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
