import {
  OrganizationId,
  OrganizationPermission,
} from "@effect-template/domain/organization";
import { Context, Effect, Layer, Schema } from "effect";

/**
 * Request-scoped authorization for the current authenticated Principal.
 * @effect-leakable-service
 */
export interface Interface {
  /** Requires the current Principal to hold a permission in the Organization. */
  readonly require: (
    organizationId: OrganizationId,
    permission: OrganizationPermission
  ) => Effect.Effect<
    void,
    NotMember | PermissionDenied | Unauthenticated | Unavailable
  >;
}

/** Authorizes Organization operations for the current request or command. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/Authorization"
) {}

/** Indicates that authorization has no authenticated Principal. */
export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "Authorization.Unauthenticated",
  {}
) {}

/** Indicates that the current Principal is not a Member of the Organization. */
export class NotMember extends Schema.TaggedErrorClass<NotMember>()(
  "Authorization.NotMember",
  { organizationId: OrganizationId }
) {}

/** Indicates that the current Member lacks the requested Organization Permission. */
export class PermissionDenied extends Schema.TaggedErrorClass<PermissionDenied>()(
  "Authorization.PermissionDenied",
  { organizationId: OrganizationId, permission: OrganizationPermission }
) {}

/** Indicates that an Organization permission could not be determined. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "Authorization.Unavailable",
  { cause: Schema.Defect() }
) {}

/** Authorization implementation that permits every permission in focused tests. */
export const allowAll = Service.of({ require: () => Effect.void });

/** Provides an Authorization that permits every permission in focused tests. */
export const layerAllowAll = Layer.succeed(Service, allowAll);

/** Authorization implementation with no authenticated Principal for focused tests. */
export const unauthenticated = Service.of({
  require: () => Effect.fail(new Unauthenticated()),
});

/** Provides an Authorization with no authenticated Principal in focused tests. */
export const layerUnauthenticated = Layer.succeed(Service, unauthenticated);
