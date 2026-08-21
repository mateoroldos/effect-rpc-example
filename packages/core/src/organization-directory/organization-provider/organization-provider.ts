import type {
  Organization,
  OrganizationId,
  OrganizationInvitationId,
} from "@effect-template/domain/organization";
import { Context, type Effect } from "effect";
import type { Authorization } from "../../authorization/index.ts";
import type {
  Conflict,
  CreateInput,
  InvitationNotFound,
  InviteInput,
  Malformed,
  OrganizationPeople,
  Unavailable,
  VisibleOrganization,
} from "../organization-directory.ts";

/** Request-bound Organization operations implemented by an external provider. */
export interface Interface {
  readonly acceptInvitation: (
    invitationId: OrganizationInvitationId
  ) => Effect.Effect<void, InvitationNotFound | Unavailable>;
  readonly create: (
    input: CreateInput
  ) => Effect.Effect<Organization, Conflict | Malformed | Unavailable>;
  readonly find: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    VisibleOrganization,
    Authorization.NotMember | Malformed | Unavailable
  >;
  readonly invite: (input: InviteInput) => Effect.Effect<void, Unavailable>;
  readonly list: Effect.Effect<
    readonly Organization[],
    Malformed | Unavailable
  >;
  readonly listPeople: (
    organizationId: OrganizationId
  ) => Effect.Effect<OrganizationPeople, Malformed | Unavailable>;
}

/** External Organization provider bound to the current request. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/OrganizationDirectory/Provider"
) {}
