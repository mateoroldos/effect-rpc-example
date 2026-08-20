import { Authorization } from "@effect-template/core/authorization";
import type {
  OrganizationId,
  OrganizationPermission,
} from "@effect-template/domain/organization";
import { isAPIError } from "better-auth/api";
import { Context, Effect, Layer } from "effect";

import { BetterAuthInstance } from "../better-auth-instance/index.ts";
import { betterAuthPermissions } from "../organization-access-control.ts";

/** Evaluates Organization permissions from Better Auth request credentials. */
export interface Interface {
  /** Requires the request credentials to grant an Organization permission. */
  readonly require: (
    headers: Headers,
    organizationId: OrganizationId,
    permission: OrganizationPermission
  ) => Effect.Effect<
    void,
    | Authorization.Unauthenticated
    | Authorization.Forbidden
    | Authorization.Unavailable
  >;
}

/** Better Auth adapter for the Authorization application port. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/AuthorizationBetterAuth"
) {}

const make = Effect.gen(function* makeAuthorizationBetterAuth() {
  const { auth } = yield* BetterAuthInstance.Service;

  const require = Effect.fn("AuthorizationBetterAuth.require")(function* (
    headers: Headers,
    organizationId: OrganizationId,
    permission: OrganizationPermission
  ) {
    const result = yield* Effect.tryPromise({
      catch: (cause) =>
        isAPIError(cause) && cause.status === "UNAUTHORIZED"
          ? new Authorization.Unauthenticated()
          : new Authorization.Unavailable({ cause }),
      try: () =>
        auth.api.hasPermission({
          body: {
            organizationId,
            permissions: betterAuthPermissions[permission],
          },
          headers,
        }),
    });
    if (!result.success) {
      return yield* new Authorization.Forbidden({ organizationId });
    }
  });

  return Service.of({ require });
});

/** Provides the Better Auth Authorization adapter with its dependency open. */
export const layerWithoutDependencies = Layer.effect(Service, make);
