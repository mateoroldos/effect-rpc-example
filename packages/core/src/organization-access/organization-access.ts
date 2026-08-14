import type { Principal } from "@effect-template/domain/identity";
import { OrganizationId } from "@effect-template/domain/organization";
import { Context, Effect, Layer, Schema } from "effect";

/** Application authorization required for Organization-owned resources. */
export interface Interface {
  /** Requires the Principal to be a Member of the requested Organization. */
  readonly requireMember: (
    principal: Principal,
    organizationId: OrganizationId
  ) => Effect.Effect<void, NotMember | Unavailable>;
}

/** Context service for Organization membership authorization. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/OrganizationAccess"
) {}

/** Indicates that a Principal is not a Member of the requested Organization. */
export class NotMember extends Schema.TaggedErrorClass<NotMember>()(
  "OrganizationAccess.NotMember",
  { organizationId: OrganizationId }
) {}

/** Indicates that Organization membership could not be determined. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "OrganizationAccess.Unavailable",
  { cause: Schema.Defect() }
) {}

/** Provides authorization that permits every Principal for focused service tests. */
export const layerAllowAll = Layer.succeed(
  Service,
  Service.of({ requireMember: () => Effect.void })
);
