import { Authorization } from "@effect-template/core/authorization";
import {
  type OrganizationId,
  type OrganizationPermission,
  OrganizationRole,
  organizationRoleAllows,
} from "@effect-template/domain/organization";
import { isAPIError } from "better-auth/api";
import { ORGANIZATION_ERROR_CODES } from "better-auth/client/plugins";
import { Context, Effect, Layer, Schema } from "effect";

import { BetterAuthInstance } from "../better-auth-instance/index.ts";

/** Evaluates Organization permissions from Better Auth request credentials. */
export interface Interface {
  /** Requires the request credentials to grant an Organization Permission. */
  readonly require: (
    headers: Headers,
    organizationId: OrganizationId,
    permission: OrganizationPermission
  ) => Effect.Effect<
    void,
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Authorization.Unauthenticated
    | Authorization.Unavailable
  >;
}

/** Better Auth adapter for the Authorization application port. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/AuthorizationBetterAuth"
) {}

const decodeOrganizationRole = Schema.decodeUnknownEffect(OrganizationRole);

const make = Effect.gen(function* makeAuthorizationBetterAuth() {
  const { auth } = yield* BetterAuthInstance.Service;

  const require = Effect.fn("AuthorizationBetterAuth.require")(function* (
    headers: Headers,
    organizationId: OrganizationId,
    permission: OrganizationPermission
  ) {
    const result = yield* Effect.tryPromise({
      catch: (cause) => classifyMembershipFailure(cause, organizationId),
      try: () =>
        auth.api.getActiveMemberRole({
          headers,
          query: { organizationId },
        }),
    });
    const role = yield* decodeOrganizationRole(result.role).pipe(
      Effect.mapError((cause) => new Authorization.Unavailable({ cause }))
    );
    if (!organizationRoleAllows(role, permission)) {
      return yield* new Authorization.PermissionDenied({
        organizationId,
        permission,
      });
    }
  });

  return Service.of({ require });
});

/** Provides the Better Auth Authorization adapter with its dependency open. */
export const layerWithoutDependencies = Layer.effect(Service, make);

const classifyMembershipFailure = (
  cause: unknown,
  organizationId: OrganizationId
):
  | Authorization.NotMember
  | Authorization.Unauthenticated
  | Authorization.Unavailable => {
  if (!isAPIError(cause)) {
    return new Authorization.Unavailable({ cause });
  }
  if (cause.status === "UNAUTHORIZED") {
    return new Authorization.Unauthenticated();
  }
  if (
    cause.body?.code ===
      ORGANIZATION_ERROR_CODES.YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION.code ||
    cause.body?.code === ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND.code
  ) {
    return new Authorization.NotMember({ organizationId });
  }
  return new Authorization.Unavailable({ cause });
};
