import { assert, describe, it } from "@effect/vitest";
import { BetterAuthInstance } from "@effect-template/auth-better/better-auth-instance";
import { BetterAuthSession } from "@effect-template/auth-better/better-auth-session";
import { makeAuth } from "@effect-template/auth-better/config";
import { OrganizationAccessBetterAuth } from "@effect-template/auth-better/organization-access";
import { OrganizationAccess } from "@effect-template/core/organization-access";
// biome-ignore lint/performance/noNamespaceImport: Better Auth requires the complete generated schema module.
import * as authSchema from "@effect-template/database/auth-schema";
import { DatabasePostgres } from "@effect-template/database/postgres";
import { Principal, UserId } from "@effect-template/domain/identity";
import { OrganizationId } from "@effect-template/domain/organization";
import { ConfigProvider, Effect, Layer, Option, Redacted } from "effect";

import { betterAuthDatabase, effectDatabaseLayer } from "../infra/database.ts";
import { PostgresPool } from "../infra/postgres-pool/index.ts";
import { acquireDisposableDatabaseUrl } from "../test/disposable-postgres.ts";

describe("Better Auth database integration", () => {
  it.effect("persists auth data readable through Effect Drizzle", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const databaseUrl = yield* acquireDisposableDatabaseUrl;

        const testDatabaseLayer = effectDatabaseLayer.pipe(
          Layer.provideMerge(PostgresPool.layer),
          Layer.provide(
            ConfigProvider.layer(
              ConfigProvider.fromUnknown({
                DATABASE_URL: Redacted.value(databaseUrl),
              })
            )
          )
        );

        yield* Effect.gen(function* () {
          yield* DatabasePostgres.runMigrations;
          const database = yield* betterAuthDatabase;
          const effectDatabase = yield* DatabasePostgres.Service;
          const auth = makeAuth(database, authSchema, {
            baseURL: "http://auth.integration.test",
            secret: "integration-test-secret-at-least-32-characters",
          });

          const signupResponse = yield* Effect.tryPromise(() =>
            auth.api.signUpEmail({
              asResponse: true,
              body: {
                email: "member@example.com",
                name: "Member",
                password: "correct horse battery staple",
              },
            })
          );
          const cookie = signupResponse.headers
            .get("set-cookie")
            ?.split(";", 1)[0];
          if (!cookie) {
            return yield* Effect.die(
              new Error("signup response omitted Set-Cookie")
            );
          }

          const session = yield* Effect.tryPromise(() =>
            auth.api.getSession({ headers: new Headers({ cookie }) })
          );
          assert.ok(session);
          assert.strictEqual(session.user.email, "member@example.com");

          const persistedUsers = yield* effectDatabase
            .select()
            .from(authSchema.user);
          assert.strictEqual(persistedUsers.length, 1);
          assert.instanceOf(persistedUsers[0]?.createdAt, Date);

          const createdOrganization = yield* Effect.tryPromise(() =>
            auth.api.createOrganization({
              body: { name: "Acme", slug: "acme" },
              headers: new Headers({ cookie }),
            })
          );
          const outsider = yield* Effect.tryPromise(() =>
            auth.api.signUpEmail({
              body: {
                email: "outsider@example.com",
                name: "Outsider",
                password: "correct horse battery staple",
              },
            })
          );
          const memberPrincipal = Principal.make({
            userId: UserId.make(session.user.id),
          });
          const outsiderPrincipal = Principal.make({
            userId: UserId.make(outsider.user.id),
          });
          const organizationId = OrganizationId.make(createdOrganization.id);
          const authAdaptersLayer = Layer.merge(
            BetterAuthSession.layerWithoutDependencies,
            OrganizationAccessBetterAuth.layerWithoutDependencies
          ).pipe(
            Layer.provide(
              BetterAuthInstance.layer(database, authSchema, {
                baseURL: "http://auth.integration.test",
                secret: "integration-test-secret-at-least-32-characters",
              })
            )
          );

          yield* Effect.gen(function* () {
            const access = yield* OrganizationAccess.Service;
            const sessions = yield* BetterAuthSession.Service;
            assert.deepEqual(
              yield* sessions.resolvePrincipal(new Headers()),
              Option.none()
            );
            assert.deepEqual(
              yield* sessions.resolvePrincipal(new Headers({ cookie })),
              Option.some(memberPrincipal)
            );
            yield* access.requireMember(memberPrincipal, organizationId);
            const denied = yield* access
              .requireMember(outsiderPrincipal, organizationId)
              .pipe(Effect.flip);
            assert.strictEqual(denied._tag, "OrganizationAccess.NotMember");
          }).pipe(
            // @effect-diagnostics-next-line strictEffectProvide:off
            Effect.provide(authAdaptersLayer)
          );
        }).pipe(
          // @effect-diagnostics-next-line strictEffectProvide:off
          Effect.provide(testDatabaseLayer)
        );
      })
    )
  );
});
