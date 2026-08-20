import { assert, describe, it } from "@effect/vitest";
import { AuthorizationBetterAuth } from "@effect-template/auth-better/authorization";
import { BetterAuthEmail } from "@effect-template/auth-better/better-auth-email";
import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { OrganizationId } from "@effect-template/domain/organization";
import { Effect, Layer, Redacted } from "effect";

import { betterAuthDatabase, effectDatabaseLayer } from "../infra/database.ts";
import { PostgresPool } from "../infra/postgres-pool/index.ts";
import { acquireDisposableDatabaseUrl } from "../test/disposable-postgres.ts";

describe("Better Auth database integration", () => {
  it.effect("persists auth data and authorizes Organization permissions", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const databaseUrl = yield* acquireDisposableDatabaseUrl;
        const verificationUrls: string[] = [];
        const betterAuthEmailLayer = Layer.succeed(
          BetterAuthEmail.Service,
          BetterAuthEmail.Service.of({
            sendInvitation: () => Effect.void,
            sendPasswordReset: () => Effect.void,
            sendVerification: (_email, url) =>
              Effect.sync(() => {
                verificationUrls.push(url);
              }),
          })
        );

        const testDatabaseLayer = effectDatabaseLayer.pipe(
          Layer.provideMerge(PostgresPool.layer(databaseUrl))
        );

        yield* Effect.gen(function* () {
          yield* DatabasePostgres.runMigrations;
          const database = yield* betterAuthDatabase;
          const effectDatabase = yield* DatabasePostgres.Service;
          const instanceLayer = BetterAuthInstance.layerWithoutDependencies({
            baseUrl: new URL("https://api.integration.test"),
            cookieDomain: "integration.test",
            database,
            schema: authSchema,
            secret: Redacted.make(
              "integration-test-secret-at-least-32-characters"
            ),
            webBaseUrl: new URL("https://app.integration.test"),
          }).pipe(Layer.provide(betterAuthEmailLayer));
          const boundariesLayer = Layer.merge(
            instanceLayer,
            AuthorizationBetterAuth.layerWithoutDependencies.pipe(
              Layer.provide(instanceLayer)
            )
          );
          const boundaries = yield* Layer.build(boundariesLayer);
          const { auth } = yield* BetterAuthInstance.Service.pipe(
            Effect.provide(boundaries)
          );
          const authorization = yield* AuthorizationBetterAuth.Service.pipe(
            Effect.provide(boundaries)
          );

          const register = (email: string, name: string) =>
            Effect.gen(function* () {
              yield* Effect.tryPromise(() =>
                auth.api.signUpEmail({
                  body: {
                    callbackURL: "https://app.integration.test/login",
                    email,
                    name,
                    password: "correct horse battery staple",
                  },
                })
              );
              const verificationUrl = verificationUrls.at(-1);
              assert.isDefined(verificationUrl);
              const verificationResponse = yield* Effect.tryPromise(() =>
                auth.handler(new Request(verificationUrl))
              );
              assert.strictEqual(verificationResponse.status, 302);

              const response = yield* Effect.tryPromise(() =>
                auth.api.signInEmail({
                  asResponse: true,
                  body: {
                    email,
                    password: "correct horse battery staple",
                  },
                })
              );
              const cookie = response.headers
                .get("set-cookie")
                ?.split(";", 1)[0];
              assert.isDefined(cookie);
              return cookie;
            });

          const ownerCookie = yield* register("owner@example.com", "Owner");
          const ownerHeaders = new Headers({ cookie: ownerCookie });
          const ownerSession = yield* Effect.tryPromise(() =>
            auth.api.getSession({ headers: ownerHeaders })
          );
          assert.ok(ownerSession);

          const persistedUsers = yield* effectDatabase
            .select()
            .from(authSchema.user);
          assert.strictEqual(persistedUsers.length, 1);
          assert.instanceOf(persistedUsers[0]?.createdAt, Date);

          const organization = yield* Effect.tryPromise(() =>
            auth.api.createOrganization({
              body: { name: "Acme", slug: "acme" },
              headers: ownerHeaders,
            })
          );
          const memberCookie = yield* register("member@example.com", "Member");
          const memberHeaders = new Headers({ cookie: memberCookie });
          const memberSession = yield* Effect.tryPromise(() =>
            auth.api.getSession({ headers: memberHeaders })
          );
          assert.ok(memberSession);
          yield* Effect.tryPromise(() =>
            auth.api.addMember({
              body: {
                organizationId: organization.id,
                role: "member",
                userId: memberSession.user.id,
              },
              headers: ownerHeaders,
            })
          );

          const organizationId = OrganizationId.make(organization.id);
          yield* authorization.require(
            ownerHeaders,
            organizationId,
            "agent:create"
          );
          yield* authorization.require(
            memberHeaders,
            organizationId,
            "agent:read"
          );

          const forbidden = yield* authorization
            .require(memberHeaders, organizationId, "agent:create")
            .pipe(Effect.flip);
          assert.strictEqual(forbidden._tag, "Authorization.Forbidden");

          const unauthenticated = yield* authorization
            .require(new Headers(), organizationId, "agent:read")
            .pipe(Effect.flip);
          assert.strictEqual(
            unauthenticated._tag,
            "Authorization.Unauthenticated"
          );
        }).pipe(
          // @effect-diagnostics-next-line strictEffectProvide:off
          Effect.provide(testDatabaseLayer)
        );
      })
    )
  );
});
