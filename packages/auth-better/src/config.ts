import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Effect } from "effect";

import type { Interface as BetterAuthEmail } from "./better-auth-email/better-auth-email.ts";
import { accessControl, roles } from "./organization-access-control.ts";

/** Schema-affecting Better Auth policy shared by generation and runtime. */
export const schemaOptions = {
  advanced: { database: { generateId: "uuid" as const } },
  emailAndPassword: { enabled: true },
  plugins: [organization({ ac: accessControl, roles })],
};

/** Better Auth settings supplied by the deployable composition root. */
export interface RuntimeOptions {
  /** Public URL serving Better Auth HTTP endpoints. */
  readonly baseURL: string;
  /** Secret used to sign and encrypt Better Auth state. */
  readonly secret: string;
}

/** Constructs Better Auth over the supplied Promise-returning Drizzle database. */
export const makeAuth = (
  database: NodePgDatabase,
  schema: DrizzleAdapterConfig["schema"],
  runtime: RuntimeOptions,
  betterAuthEmail: BetterAuthEmail
) =>
  betterAuth({
    ...schemaOptions,
    baseURL: runtime.baseURL,
    database: drizzleAdapter(database, { provider: "pg", schema }),
    emailAndPassword: {
      ...schemaOptions.emailAndPassword,
      sendResetPassword: ({ user, url }) =>
        Effect.runPromise(betterAuthEmail.sendPasswordReset(user.email, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        Effect.runPromise(betterAuthEmail.sendVerification(user.email, url)),
    },
    plugins: [
      organization({
        ac: accessControl,
        roles,
        sendInvitationEmail: ({ email, id }) =>
          Effect.runPromise(betterAuthEmail.sendInvitation(email, id)),
      }),
    ],
    secret: runtime.secret,
  });

/** Configured Better Auth instance shared by its narrow runtime adapters. */
export type BetterAuthInstance = ReturnType<typeof makeAuth>;
